/**
 * In-memory per-key rate limiter (fixed-window).
 *
 * IMPORTANT: This is per Vercel serverless instance only. Use it as a
 * cheap first line of defense; for distributed/persistent limiting, add
 * Vercel KV + `@upstash/ratelimit` in front (see README → Audit Checklist).
 */

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

export interface RateLimitResult {
  limited: boolean;
  remaining: number;
  resetAt: number;
}

export type RateLimiter = (key: string | null | undefined) => RateLimitResult;

interface Bucket {
  windowStart: number;
  count: number;
}

/**
 * Factory — returns a `check(key)` function bound to a private Map.
 */
export function createRateLimiter({ windowMs, max }: RateLimitOptions): RateLimiter {
  const buckets = new Map<string, Bucket>();

  return function check(key) {
    if (!key) return { limited: false, remaining: max, resetAt: Date.now() + windowMs };
    const now = Date.now();
    const entry = buckets.get(key);

    if (!entry || now - entry.windowStart > windowMs) {
      buckets.set(key, { windowStart: now, count: 1 });
      return { limited: false, remaining: max - 1, resetAt: now + windowMs };
    }

    entry.count += 1;
    const remaining = Math.max(0, max - entry.count);
    const resetAt = entry.windowStart + windowMs;
    return { limited: entry.count > max, remaining, resetAt };
  };
}

export interface DurableRateLimitOptions extends RateLimitOptions {
  /** key namespace so different routes don't share a counter */
  prefix?: string;
}

export type AsyncRateLimiter = (key: string | null | undefined) => Promise<RateLimitResult>;

/** Read Upstash creds from either the native or the Vercel KV env var names. */
function upstashCreds(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

/**
 * Durable, cross-instance fixed-window limiter backed by Upstash Redis (REST),
 * with a per-instance in-memory FALLBACK.
 *
 * Design goals (this code runs in the live serverless functions):
 *  - No extra npm deps — uses `fetch` + the Upstash REST `/pipeline` endpoint.
 *  - FAIL-SAFE: if Upstash isn't configured, or any request errors, it falls
 *    back to the in-memory limiter and NEVER throws. Rate limiting degrading to
 *    per-instance is acceptable; a crashing limiter (500) is not.
 */
export function createDurableLimiter({ windowMs, max, prefix = 'rl' }: DurableRateLimitOptions): AsyncRateLimiter {
  const memory = createRateLimiter({ windowMs, max });
  const creds = upstashCreds();

  return async function check(key) {
    if (!key) return { limited: false, remaining: max, resetAt: Date.now() + windowMs };
    if (!creds) return memory(key);

    const redisKey = `${prefix}:${key}`;
    try {
      // Atomic-enough: INCR the counter, set the window TTL only on first hit
      // (PEXPIRE ... NX), then read the remaining TTL — one round trip.
      const res = await fetch(`${creds.url}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${creds.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', redisKey],
          ['PEXPIRE', redisKey, String(windowMs), 'NX'],
          ['PTTL', redisKey],
        ]),
      });
      if (!res.ok) return memory(key);

      const data = (await res.json()) as Array<{ result?: number }>;
      const count = Number(data?.[0]?.result ?? 0);
      const ttl = Number(data?.[2]?.result ?? windowMs);
      if (!Number.isFinite(count) || count <= 0) return memory(key);

      return {
        limited: count > max,
        remaining: Math.max(0, max - count),
        resetAt: Date.now() + (ttl > 0 ? ttl : windowMs),
      };
    } catch {
      // Network / parse error → degrade to in-memory rather than 500.
      return memory(key);
    }
  };
}

interface RequestLike {
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}

/**
 * Extract a best-effort client IP from request headers.
 */
export function getClientIp(req: RequestLike): string {
  const fwd = req.headers?.['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}
