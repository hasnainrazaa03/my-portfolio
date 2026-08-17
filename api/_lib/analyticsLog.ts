/**
 * Server-side analytics write.
 *
 * WHY THIS REPLACES THE CLIENT-SIDE POST
 * --------------------------------------
 * Analytics only ever recorded chat interactions: a (question, response) pair.
 * The browser was posting those to /api/analytics, which meant the write had to
 * be gated by a token the browser could read — `VITE_ANALYTICS_WRITE_TOKEN`,
 * inlined into the bundle by design. It was never a secret: it can be lifted
 * out of the shipped JavaScript in seconds, so the "gate" stopped anyone who
 * could not be bothered and nobody else.
 *
 * The fix is not a better-guarded token, it is not needing one. /api/chat
 * ALREADY has the question (it answered it) and the response (it produced it),
 * so it can write the row itself using the service key that never leaves the
 * server. The public write endpoint and its browser-readable credential are
 * both deleted rather than hardened.
 *
 * NO SUPABASE SDK: importing @supabase/supabase-js here would pull it into the
 * chat lambda, which is deliberately small (518 KB) for cold-start reasons.
 * PostgREST is a plain HTTP API and this file is ~30 lines of fetch — the same
 * tradeoff api/_lib/rateLimit.ts makes for Upstash and api/_lib/sentry.ts makes
 * for Sentry.
 *
 * PRIVACY (unchanged from the old handler): raw IPs are never stored, only a
 * salted SHA-256 hash. user_agent and referrer are written as the literal
 * string 'redacted' to satisfy the existing NOT NULL columns.
 */
import { randomUUID } from 'node:crypto';
import { hashIp } from './hashIp.js';
import { usableSecret } from './secrets.js';

export interface InteractionRecord {
  question: string;
  response: string;
  sessionId?: string | null;
  /** Client IP, hashed before it reaches the database. */
  ip?: string | null;
  requestId?: string;
}

/** Trailing slashes here produce `//rest/v1/...`, which PostgREST 404s. */
function restEndpoint(base: string): string {
  return `${base.replace(/\/+$/, '')}/rest/v1/jarvis_analytics`;
}

/**
 * Record one chat interaction.
 *
 * NEVER THROWS and never rejects: analytics is a nice-to-have, and a logging
 * failure must not turn a delivered answer into a 500. Callers await it only so
 * the serverless instance is not frozen mid-request.
 *
 * @returns true when the row was accepted, false otherwise (for tests/logging).
 */
export async function recordInteraction(record: InteractionRecord): Promise<boolean> {
  const url = usableSecret(process.env.SUPABASE_URL, 'SUPABASE_URL');
  const key = usableSecret(process.env.SUPABASE_SERVICE_KEY, 'SUPABASE_SERVICE_KEY');
  if (!url || !key) return false;

  const question = String(record.question ?? '').trim();
  const response = String(record.response ?? '').trim();
  if (!question || !response) return false;

  try {
    const res = await fetch(restEndpoint(url), {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        // Nothing reads the inserted row back; skipping the representation
        // keeps the response body empty.
        Prefer: 'return=minimal',
      },
      body: JSON.stringify([
        {
          id: randomUUID(),
          question: question.slice(0, 1000),
          response: response.slice(0, 4000),
          session_id:
            typeof record.sessionId === 'string' && record.sessionId
              ? record.sessionId.slice(0, 64)
              : null,
          timestamp: new Date().toISOString(),
          user_agent: 'redacted',
          referrer: 'redacted',
          // hashIp maps an empty/absent IP to 'unknown', which is what the old
          // handler stored too — never a raw address either way.
          ip_address: hashIp(record.ip ?? ''),
        },
      ]),
      // The answer is already on the wire by the time this runs; a slow insert
      // must not hold the invocation open.
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(
        `[analytics][${record.requestId ?? '-'}] insert failed ${res.status}: ${body.slice(0, 120)}`,
      );
      return false;
    }
    return true;
  } catch (err) {
    console.warn(
      `[analytics][${record.requestId ?? '-'}] insert error: ${err instanceof Error ? err.message : String(err)}`,
    );
    return false;
  }
}
