/**
 * hashIp.test.js — tests for the salted IP-hashing helper.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hashIp } from '../../api/_lib/hashIp';

describe('hashIp', () => {
  const originalSalt = process.env.ANALYTICS_IP_SALT;

  beforeEach(() => {
    process.env.ANALYTICS_IP_SALT = 'test-salt';
  });
  afterEach(() => {
    process.env.ANALYTICS_IP_SALT = originalSalt;
  });

  it('returns a non-empty opaque hex string for a normal IP', () => {
    const h = hashIp('203.0.113.7');
    expect(h).toMatch(/^[0-9a-f]{16}$/);
  });

  it('is deterministic for the same IP + salt', () => {
    expect(hashIp('1.2.3.4')).toBe(hashIp('1.2.3.4'));
  });

  it('changes when the salt changes (per-deploy unlinkable)', () => {
    const a = hashIp('1.2.3.4');
    process.env.ANALYTICS_IP_SALT = 'different-salt';
    const b = hashIp('1.2.3.4');
    expect(a).not.toBe(b);
  });

  it('returns a distinct hash for distinct IPs', () => {
    expect(hashIp('1.2.3.4')).not.toBe(hashIp('1.2.3.5'));
  });

  it('returns "unknown" for invalid input', () => {
    expect(hashIp(undefined)).toBe('unknown');
    expect(hashIp(null)).toBe('unknown');
    expect(hashIp('')).toBe('unknown');
    expect(hashIp(42)).toBe('unknown');
  });

  it('does NOT contain the raw IP', () => {
    const h = hashIp('192.168.1.1');
    expect(h.includes('192')).toBe(false);
  });
});
