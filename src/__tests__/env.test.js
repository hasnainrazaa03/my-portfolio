/**
 * env.test.js — central client env config: shape + graceful-degrade flags.
 */
import { describe, it, expect, vi } from 'vitest';
import { readEnv, warnMissingEnv } from '../config/env.js';

const FULL = {
  VITE_EMAILJS_SERVICE_ID: 'svc',
  VITE_EMAILJS_TEMPLATE_ID: 'tpl',
  VITE_EMAILJS_PUBLIC_KEY: 'pub',
  VITE_ANALYTICS_WRITE_TOKEN: 'tok',
  VITE_ENABLE_ADMIN: 'true',
};

describe('readEnv', () => {
  it('returns the expected shape when all vars are present', () => {
    const e = readEnv(FULL);
    expect(e.emailjs).toEqual({ serviceId: 'svc', templateId: 'tpl', publicKey: 'pub', isConfigured: true });
    expect(e.analyticsWriteToken).toBe('tok');
    expect(e.adminEnabled).toBe(true);
  });

  it('marks emailjs unconfigured when any of the three keys is missing', () => {
    expect(readEnv({ ...FULL, VITE_EMAILJS_PUBLIC_KEY: undefined }).emailjs.isConfigured).toBe(false);
    expect(readEnv({ ...FULL, VITE_EMAILJS_SERVICE_ID: '' }).emailjs.isConfigured).toBe(false);
    expect(readEnv({}).emailjs.isConfigured).toBe(false);
  });

  it('treats adminEnabled as a strict "true" string flag', () => {
    expect(readEnv({ VITE_ENABLE_ADMIN: 'true' }).adminEnabled).toBe(true);
    expect(readEnv({ VITE_ENABLE_ADMIN: 'false' }).adminEnabled).toBe(false);
    expect(readEnv({ VITE_ENABLE_ADMIN: '1' }).adminEnabled).toBe(false);
    expect(readEnv({}).adminEnabled).toBe(false);
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
