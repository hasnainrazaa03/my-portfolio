/**
 * cors.test.js — origin allow-listing.
 *
 * REGRESSION GUARD: the previous rule accepted ANY `*.vercel.app` origin, so
 * anyone could deploy a page to Vercel and drive this project's LLM spend from
 * a browser. Preview deployments must still work, so the match is on the
 * project's host prefix rather than the whole TLD.
 */
import { describe, it, expect } from 'vitest';
import { isAllowedOrigin } from '../../api/_lib/cors';

describe('isAllowedOrigin', () => {
  it('allows the production origin', () => {
    expect(isAllowedOrigin('https://hasnainrazaa.vercel.app')).toBe(true);
    expect(isAllowedOrigin('https://hasnainrazaa.vercel.app/')).toBe(true);
  });

  it('allows this project\'s preview deployments', () => {
    expect(isAllowedOrigin('https://my-portfolio-abc123-hasnain.vercel.app')).toBe(true);
    expect(isAllowedOrigin('https://my-portfolio-git-main-hasnain.vercel.app')).toBe(true);
    expect(isAllowedOrigin('https://hasnainrazaa-xyz789.vercel.app')).toBe(true);
  });

  it('rejects a third party\'s vercel.app deployment', () => {
    expect(isAllowedOrigin('https://evil.vercel.app')).toBe(false);
    expect(isAllowedOrigin('https://someone-elses-app.vercel.app')).toBe(false);
  });

  it('rejects a prefix-lookalike that is not a real label boundary', () => {
    // "my-portfolioX" must not pass just because it starts with the prefix.
    expect(isAllowedOrigin('https://my-portfolioevil.vercel.app')).toBe(false);
    expect(isAllowedOrigin('https://hasnainrazaaevil.vercel.app')).toBe(false);
  });

  it('rejects a lookalike domain that merely ends with the string', () => {
    expect(isAllowedOrigin('https://notvercel.app')).toBe(false);
    expect(isAllowedOrigin('https://my-portfolio.vercel.app.evil.com')).toBe(false);
  });

  it('allows localhost for development', () => {
    expect(isAllowedOrigin('http://localhost:5173')).toBe(true);
    expect(isAllowedOrigin('http://127.0.0.1:3000')).toBe(true);
  });

  it('rejects missing or malformed origins', () => {
    expect(isAllowedOrigin(null)).toBe(false);
    expect(isAllowedOrigin(undefined)).toBe(false);
    expect(isAllowedOrigin('')).toBe(false);
    expect(isAllowedOrigin('not-a-url')).toBe(false);
  });
});
