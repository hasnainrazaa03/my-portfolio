/**
 * secrets.test.js — runtime rejection of masked server secrets.
 *
 * The client-side twin (validateClientEnv.test.js) covers VITE_ vars at build
 * time. This covers the higher-stakes case: a mask-only value is *predictable*,
 * so an ANALYTICS_SECRET_TOKEN stored as bullets would let anyone who knows the
 * failure mode bearer-auth their way into 1000 rows of visitor questions.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usableSecret, resetSecretWarnings } from '../../api/_lib/secrets';

beforeEach(() => {
  resetSecretWarnings();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('usableSecret', () => {
  it('returns a real secret unchanged', () => {
    const token = 'a3f8'.repeat(16);
    expect(usableSecret(token, 'TOKEN')).toBe(token);
  });

  it('treats a bullet-masked value as unset', () => {
    expect(usableSecret('•'.repeat(64), 'ANALYTICS_SECRET_TOKEN')).toBeNull();
  });

  it.each([['·'], ['●'], ['▪'], ['∙'], ['*']])('treats %s-masked values as unset', (ch) => {
    expect(usableSecret(ch.repeat(32), 'TOKEN')).toBeNull();
  });

  it('logs which variable is wrong, so the fix is obvious from the logs', () => {
    usableSecret('•'.repeat(64), 'ANALYTICS_SECRET_TOKEN');
    expect(console.error).toHaveBeenCalledTimes(1);
    const msg = console.error.mock.calls[0][0];
    expect(msg).toMatch(/ANALYTICS_SECRET_TOKEN/);
    expect(msg).toMatch(/64 mask characters/);
    expect(msg).toMatch(/UNSET/);
  });

  it('warns once per variable — serverless logs are noisy enough', () => {
    for (let i = 0; i < 5; i++) usableSecret('•'.repeat(64), 'ANALYTICS_SECRET_TOKEN');
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it('warns separately for distinct variables', () => {
    usableSecret('•'.repeat(8), 'A');
    usableSecret('•'.repeat(8), 'B');
    expect(console.error).toHaveBeenCalledTimes(2);
  });

  it('does not flag a value that merely contains a bullet or asterisk', () => {
    expect(usableSecret('tok*en', 'TOKEN')).toBe('tok*en');
    expect(usableSecret('https://*.example.com', 'URL')).toBe('https://*.example.com');
  });

  it('treats absent and empty as unset without warning', () => {
    expect(usableSecret(undefined, 'TOKEN')).toBeNull();
    expect(usableSecret('', 'TOKEN')).toBeNull();
    expect(usableSecret(null, 'TOKEN')).toBeNull();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('does NOT trim — a whitespace mismatch must stay visible at comparison', () => {
    expect(usableSecret('abc\n', 'TOKEN')).toBe('abc\n');
  });
});
