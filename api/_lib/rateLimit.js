/**
 * In-memory per-key rate limiter (fixed-window).
 *
 * IMPORTANT: This is per Vercel serverless instance only. Use it as a
 * cheap first line of defense; for distributed/persistent limiting, add
 * Vercel KV + `@upstash/ratelimit` in front (see README → Audit Checklist).
 */

/**
 * Factory — returns a `check(key)` function bound to a private Map.
 * @param {{ windowMs: number, max: number }} opts
 */
export function createRateLimiter({ windowMs, max }) {
  const buckets = new Map();

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

/**
 * Extract a best-effort client IP from request headers.
 */
export function getClientIp(req) {
  const fwd = req.headers?.['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}
