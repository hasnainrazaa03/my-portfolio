import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { createDurableLimiter, getClientIp } from './_lib/rateLimit.js';
import { applyCors } from './_lib/cors.js';
import { runChain, AllProvidersFailedError } from './_lib/llm.js';
import { captureServerError, flushSentry } from './_lib/sentry.js';
import {
  buildFitPrompt,
  evidenceSources,
  parseFitResult,
  prepareJobDescription,
  wrapJobDescription,
  MAX_JD_CHARS,
  MIN_JD_CHARS,
} from './_lib/fitAnalysis.js';

/**
 * /api/fit — score a pasted job description against the real record.
 *
 * Same posture as /api/chat: server-controlled prompt, no client-supplied
 * context or provider, upstream errors never echoed, per-IP rate limiting,
 * `x-request-id` on every response.
 *
 * TWO THINGS ARE DELIBERATELY STRICTER THAN CHAT.
 *
 * The rate limit is far tighter. A chat turn is one short answer; this sends
 * the entire evidence corpus plus up to 12 KB of pasted posting on every call,
 * so it is the most expensive request the site can make. Three per ten minutes
 * is generous for the actual use (a recruiter has one posting in hand) and
 * ungenerous for anything automated.
 *
 * The response is validated, not forwarded. `parseFitResult` drops any match
 * whose `sourceId` is not a real project or role, so the endpoint cannot emit
 * a claim attributed to work that does not exist — see fitAnalysis.ts.
 */

function positiveInt(raw: string | undefined, fallback: number): number {
  const n = Number.parseInt(raw || '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const RATE_LIMIT_MAX = positiveInt(process.env.FIT_RATE_LIMIT_MAX, 3);
const RATE_LIMIT_WINDOW_MS = positiveInt(process.env.FIT_RATE_LIMIT_WINDOW_MS, 600_000);
const fitLimiter = createDurableLimiter({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  prefix: 'fit',
});

/**
 * Per-provider budget for THIS endpoint, well above the 8s the chat uses.
 *
 * Measured, not guessed: the first production call took 24 seconds and still
 * returned a good answer, which is the signature of providers timing out at 8s
 * and the chain falling through. Nothing surfaced, because a fall-through
 * still produces a reply — it just costs three calls and three times the wait.
 * This prompt carries the whole evidence corpus and asks for structured JSON,
 * so it needs a budget that matches.
 *
 * The ceiling is `maxDuration` below: three providers at this timeout must fit
 * inside it, or the platform kills the request before the chain gives up.
 */
const PROVIDER_TIMEOUT_MS = positiveInt(process.env.FIT_PROVIDER_TIMEOUT_MS, 18_000);

/** Built once per cold start: the evidence corpus does not change per request. */
const SYSTEM_PROMPT = buildFitPrompt();
const VALID_SOURCE_IDS = new Set(evidenceSources().map((s) => s.id));

const REASONS: Record<string, string> = {
  invalid_input: 'Paste a job description to compare.',
  too_short: `That looks too short to be a job description — paste at least ${MIN_JD_CHARS} characters.`,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = randomUUID();
  res.setHeader('x-request-id', requestId);

  applyCors(req, res, { methods: 'POST, OPTIONS', headers: 'Content-Type' });
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed', requestId });

  // Read the body ONCE inside its own try: Vercel's `req.body` is a lazy getter
  // that THROWS on malformed JSON, which surfaced as a 500 and a Sentry event
  // for what is a plain client error. Same fix as /api/chat.
  let body: unknown;
  try {
    body = req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid request body', requestId });
  }

  const jdResult = prepareJobDescription((body as { jd?: unknown } | null)?.jd);
  if (!jdResult.ok) {
    return res.status(400).json({ error: REASONS[jdResult.reason] ?? REASONS.invalid_input, requestId });
  }

  const ip = getClientIp(req);
  const { limited, remaining, resetAt } = await fitLimiter(ip);
  res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, remaining)));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));
  if (limited) {
    const minutes = Math.max(1, Math.ceil((resetAt - Date.now()) / 60_000));
    return res.status(429).json({
      error: `That's ${RATE_LIMIT_MAX} comparisons already — each one is a full analysis. Try again in about ${minutes} minute${minutes === 1 ? '' : 's'}.`,
      requestId,
    });
  }

  try {
    const result = await runChain(
      SYSTEM_PROMPT,
      [{ role: 'user', content: wrapJobDescription(jdResult.jd) }],
      ({ provider, error }) => console.warn(`[fit:${requestId}] provider ${provider} failed: ${error}`),
      undefined,
      { timeoutMs: PROVIDER_TIMEOUT_MS },
    );

    const parsed = parseFitResult(result.text, VALID_SOURCE_IDS);
    if (!parsed) {
      // The model answered but not usably. Reported rather than dropped: it
      // means the prompt and the model have drifted apart, which is invisible
      // from the client (it just sees "unavailable") and worth knowing about.
      console.error(`[fit:${requestId}] unparseable result from ${result.provider}/${result.model}`);
      await captureServerError(new Error('Fit analysis returned no usable result'), {
        requestId,
        route: '/api/fit',
        extra: { provider: result.provider, model: result.model },
      });
      await flushSentry();
      return res.status(502).json({ error: 'Could not analyse that posting. Please try again.', requestId });
    }

    console.log(
      `[fit:${requestId}] ${result.provider}/${result.model} -> ${parsed.verdict} ` +
        `(${parsed.matches.length} matched, ${parsed.gaps.length} gaps)`,
    );
    return res.status(200).json({ ...parsed, requestId });
  } catch (err) {
    const allFailed = err instanceof AllProvidersFailedError;
    console.error(`[fit:${requestId}] failed: ${err instanceof Error ? err.message : String(err)}`);
    await captureServerError(err, { requestId, route: '/api/fit' });
    await flushSentry();
    // Never echo the upstream message — it can carry provider internals.
    return res.status(allFailed ? 503 : 500).json({
      error: 'The comparison service is unavailable right now. Please try again shortly.',
      requestId,
    });
  }
}

// Three providers at PROVIDER_TIMEOUT_MS must fit inside this, or the platform
// kills the request before the fallback chain has finished trying.
export const config = { maxDuration: 60 };

export { MAX_JD_CHARS };
