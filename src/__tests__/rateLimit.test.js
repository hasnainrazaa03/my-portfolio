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

/**
 * Upstash's /pipeline answers 200 even when individual commands fail. If
 * PEXPIRE errors, the counter has no TTL: PTTL reports -1 and trusting the
 * count blocks that IP permanently once it crosses `max`. Both shapes must fall
 * back to the in-memory limiter rather than trust a count that never resets.
 */
describe('createDurableLimiter (Upstash pipeline anomalies)', () => {
  const withUpstash = async (pipelineReply) => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://x.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'tok_' + 'a'.repeat(30);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => pipelineReply });
    vi.stubGlobal('fetch', fetchMock);
    return { fetchMock, check: createDurableLimiter({ windowMs: 60_000, max: 100, prefix: 'p' }) };
  };
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it('falls back when a command in the pipeline reports an error', async () => {
    const { check } = await withUpstash([{ result: 500 }, { error: 'ERR' }, { result: -1 }]);
    // Redis said 500 hits (> max) but the window is broken; memory says 1st hit.
    const r = await check('1.1.1.1');
    expect(r.limited).toBe(false);
    expect(r.remaining).toBe(99);
  });

  it('falls back when the key has no expiry, and repairs it', async () => {
    const { check, fetchMock } = await withUpstash([{ result: 500 }, { result: 0 }, { result: -1 }]);
    const r = await check('2.2.2.2');
    expect(r.limited).toBe(false);
    // A second pipeline call issues an unconditional PEXPIRE.
    await new Promise((res) => setTimeout(res, 0));
    const bodies = fetchMock.mock.calls.map((c) => JSON.parse(c[1].body));
    expect(bodies.some((b) => b.some((cmd) => cmd[0] === 'PEXPIRE' && cmd.length === 3))).toBe(true);
  });

  it('still trusts a healthy pipeline reply', async () => {
    const { check } = await withUpstash([{ result: 101 }, { result: 1 }, { result: 30_000 }]);
    const r = await check('3.3.3.3');
    expect(r.limited).toBe(true);
    expect(r.remaining).toBe(0);
  });
});
