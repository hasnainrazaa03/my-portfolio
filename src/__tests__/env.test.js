/**
 * env.test.js — central client env config: shape + graceful-degrade flags.
 */
import { describe, it, expect, vi } from 'vitest';
import { readEnv, warnMissingEnv } from '../config/env.js';

const FULL = {
  VITE_EMAILJS_SERVICE_ID: 'svc',
  VITE_EMAILJS_TEMPLATE_ID: 'tpl',
  VITE_EMAILJS_PUBLIC_KEY: 'pub',
};

describe('readEnv', () => {
  it('returns the expected shape when all vars are present', () => {
    const e = readEnv(FULL);
    expect(e.emailjs).toEqual({ serviceId: 'svc', templateId: 'tpl', publicKey: 'pub', isConfigured: true });
    // `analyticsWriteToken` is deliberately gone: the browser no longer writes
    // analytics at all, so there is no client-side credential to read. See
    // api/_lib/analyticsLog.ts.
    expect(e).not.toHaveProperty('analyticsWriteToken');
    // The build flag that included an in-chat analytics viewer is gone too:
    // the private /insights page replaced it, gated by the server token.
    expect(e).not.toHaveProperty('adminEnabled');
  });

  it('marks emailjs unconfigured when any of the three keys is missing', () => {
    expect(readEnv({ ...FULL, VITE_EMAILJS_PUBLIC_KEY: undefined }).emailjs.isConfigured).toBe(false);
    expect(readEnv({ ...FULL, VITE_EMAILJS_SERVICE_ID: '' }).emailjs.isConfigured).toBe(false);
    expect(readEnv({}).emailjs.isConfigured).toBe(false);
  });

  it('never throws on a totally empty source', () => {
    expect(() => readEnv({})).not.toThrow();
  });
});

describe('warnMissingEnv', () => {
  it('warns when emailjs is not configured', () => {
    const log = vi.fn();
    const warnings = warnMissingEnv(readEnv({}), log);
    expect(warnings.length).toBe(1);
    expect(log).toHaveBeenCalledTimes(1);
    expect(warnings[0]).toMatch(/EmailJS/);
  });

  it('is silent when fully configured', () => {
    const log = vi.fn();
    const warnings = warnMissingEnv(readEnv(FULL), log);
    expect(warnings).toEqual([]);
    expect(log).not.toHaveBeenCalled();
  });
});
