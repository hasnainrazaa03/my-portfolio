/**
 * rateLimit.test.js — tests for the in-memory per-key fixed-window limiter.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRateLimiter, createDurableLimiter, getClientIp } from '../../api/_lib/rateLimit';

describe('createRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests up to `max` then limits the rest', () => {
    const check = createRateLimiter({ windowMs: 60_000, max: 3 });
    expect(check('1.2.3.4').limited).toBe(false);
    expect(check('1.2.3.4').limited).toBe(false);
    expect(check('1.2.3.4').limited).toBe(false);
    expect(check('1.2.3.4').limited).toBe(true);
    expect(check('1.2.3.4').limited).toBe(true);
  });

  it('tracks different keys independently', () => {
    const check = createRateLimiter({ windowMs: 60_000, max: 1 });
    expect(check('a').limited).toBe(false);
    expect(check('b').limited).toBe(false);
    expect(check('a').limited).toBe(true);
    expect(check('b').limited).toBe(true);
  });

  it('resets after the window elapses', () => {
    const check = createRateLimiter({ windowMs: 60_000, max: 2 });
    expect(check('k').limited).toBe(false);
    expect(check('k').limited).toBe(false);
    expect(check('k').limited).toBe(true);

    vi.advanceTimersByTime(61_000);
    expect(check('k').limited).toBe(false);
  });

  it('exposes a useful `remaining` and `resetAt`', () => {
    const check = createRateLimiter({ windowMs: 60_000, max: 3 });
    const r1 = check('k');
    expect(r1.remaining).toBe(2);
    expect(r1.resetAt).toBeGreaterThan(Date.now());
    const r2 = check('k');
    expect(r2.remaining).toBe(1);
  });

  it('treats missing keys as unlimited (does not crash)', () => {
    const check = createRateLimiter({ windowMs: 60_000, max: 1 });
    expect(check(undefined).limited).toBe(false);
    expect(check('').limited).toBe(false);
  });
});

describe('createDurableLimiter (no Upstash env → in-memory fallback)', () => {
  const saved = { ...process.env };
  beforeEach(() => {
    // Ensure no Upstash/KV creds so it uses the in-memory fallback path.
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  it('falls back to in-memory limiting and blocks after `max`', async () => {
    const check = createDurableLimiter({ windowMs: 60_000, max: 2, prefix: 't' });
    expect((await check('1.2.3.4')).limited).toBe(false);
    expect((await check('1.2.3.4')).limited).toBe(false);
    expect((await check('1.2.3.4')).limited).toBe(true);
  });

  it('treats missing keys as unlimited', async () => {
    const check = createDurableLimiter({ windowMs: 60_000, max: 1 });
    expect((await check(undefined)).limited).toBe(false);
  });
});

describe('getClientIp', () => {
  it('prefers the first x-forwarded-for entry', () => {
    const req = { headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }, socket: {} };
    expect(getClientIp(req)).toBe('203.0.113.7');
  });

  it('falls back to socket.remoteAddress', () => {
    const req = { headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    expect(getClientIp(req)).toBe('127.0.0.1');
  });

  it('returns "unknown" when nothing is available', () => {
    expect(getClientIp({ headers: {}, socket: {} })).toBe('unknown');
  });
});
