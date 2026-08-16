import type { VercelRequest, VercelResponse } from '@vercel/node';
/**
 * Cached proxy for GitHub user events.
 *
 * Why a proxy:
 *   - The unauthenticated GitHub REST API limits clients to 60 req/h per IP.
 *     Every visitor would otherwise burn a request — and a viral spike could
 *     exhaust the quota and show "rate limited" to everyone.
 *   - Calling from the server lets us attach a `GITHUB_TOKEN` (5000 req/h)
 *     if one is configured, without ever exposing it to the browser.
 *   - An in-memory TTL cache (60 s) absorbs traffic bursts. On Vercel each
 *     warm lambda instance keeps its own cache, which is fine for this use.
 *
 * Privacy:
 *   - Only the configured `GITHUB_USERNAME` (or fallback) is queried.
 *   - We strip GitHub's `actor` payload before responding (no need to leak
 *     internal IDs / gravatar URLs to clients).
 */

import { applyCors } from './_lib/cors.js';
import { createDurableLimiter, getClientIp } from './_lib/rateLimit.js';
import { randomUUID } from 'node:crypto';
import { captureServerError, flushSentry } from './_lib/sentry.js';

const DEFAULT_USERNAME = 'hasnainrazaa03';
const CACHE_TTL_MS = 60_000; // 1 minute
const MAX_EVENTS = 10;
const ALLOWED_EVENT_TYPES = new Set([
  'PushEvent',
  'PullRequestEvent',
  'CreateEvent',
  'WatchEvent',
]);

/** The subset of GitHub's event payload the UI actually renders. */
interface GitHubEvent {
  id?: string;
  type?: string;
  created_at?: string;
  repo?: { name?: string } | null;
  payload?: {
    action?: string;
    ref?: string;
    ref_type?: string;
    commits?: { message?: string }[];
    pull_request?: { title?: string };
  };
}

type StrippedEvent = ReturnType<typeof stripPayload>;

interface CacheEntry {
  data: StrippedEvent[];
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const limiter = createDurableLimiter({ windowMs: 60_000, max: 30, prefix: 'github' });

/** Error carrying upstream context for logging (never sent to the client). */
class UpstreamError extends Error {
  upstreamStatus: number;
  upstreamBody: string;
  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = 'UpstreamError';
    this.upstreamStatus = status;
    this.upstreamBody = body;
  }
}

function stripPayload(event: GitHubEvent) {
  // Keep only what the UI actually renders.
  return {
    id: event.id,
    type: event.type,
    created_at: event.created_at,
    repo: event.repo ? { name: event.repo.name } : null,
    payload: {
      action: event.payload?.action,
      ref: event.payload?.ref,
      ref_type: event.payload?.ref_type,
      commits: Array.isArray(event.payload?.commits)
        ? event.payload.commits.slice(0, 3).map((c) => ({ message: c.message }))
        : undefined,
      pull_request: event.payload?.pull_request
        ? { title: event.payload.pull_request.title }
        : undefined,
    },
  };
}

async function fetchEventsFromGitHub(username: string): Promise<StrippedEvent[]> {
  const headers: Record<string, string> = { 'User-Agent': 'hasnainrazaa-portfolio' };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(
    `https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=30`,
    { headers }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new UpstreamError(`GitHub responded ${res.status}`, res.status, body.slice(0, 200));
  }

  const data = (await res.json()) as GitHubEvent[];
  if (!Array.isArray(data)) throw new UpstreamError('GitHub returned a non-array body', 502, '');

  return data
    .filter((e) => typeof e?.type === 'string' && ALLOWED_EVENT_TYPES.has(e.type))
    .slice(0, MAX_EVENTS)
    .map(stripPayload);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = randomUUID();
  res.setHeader('x-request-id', requestId);

  applyCors(req, res, { methods: 'GET, OPTIONS', headers: 'Content-Type' });

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed', requestId });
  }

  const ip = getClientIp(req);
  const { limited } = await limiter(ip);
  if (limited) {
    return res.status(429).json({ error: 'Too many requests', requestId });
  }

  const username = process.env.GITHUB_USERNAME || DEFAULT_USERNAME;
  const cached = cache.get(username);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    res.setHeader('x-cache', 'HIT');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    return res.status(200).json({ events: cached.data, requestId, cached: true });
  }

  try {
    const events = await fetchEventsFromGitHub(username);
    cache.set(username, { data: events, expiresAt: now + CACHE_TTL_MS });
    res.setHeader('x-cache', 'MISS');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    return res.status(200).json({ events, requestId, cached: false });
  } catch (err) {
    console.error(
      `[github][${requestId}] fetch failed:`,
      err instanceof Error ? err.message : String(err),
    );
    // Serve a stale cache rather than failing the UI, if we have one.
    if (cached) {
      res.setHeader('x-cache', 'STALE');
      return res.status(200).json({ events: cached.data, requestId, cached: true, stale: true });
    }
    // Only worth reporting when there was no stale cache to fall back on —
    // a served-stale response is a working degradation, not an incident.
    await captureServerError(err, { requestId, route: '/api/github' });
    await flushSentry();
    return res
      .status(502)
      .json({ error: 'Upstream GitHub API unavailable', requestId });
  }
}
