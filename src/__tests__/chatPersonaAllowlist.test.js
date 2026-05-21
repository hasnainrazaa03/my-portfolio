/**
 * chatPersonaAllowlist.test.js
 * ---------------------------------------------------------------------------
 * Verifies the persona allow-list contract used by api/chat.js.
 *
 * We can't easily import the Vercel handler (it requires a node request /
 * response shape), so this test re-implements the same allow-list and
 * asserts the documented behaviour: unknown personas MUST collapse to
 * "default" — the server must never honour an arbitrary string.
 */
import { describe, it, expect } from 'vitest';

// Mirror of api/chat.js — keep in sync with PERSONA_OVERLAYS keys.
const PERSONA_KEYS = ['default', 'recruiter', 'aerospace', 'startup'];

function resolvePersona(raw) {
  if (typeof raw !== 'string') return 'default';
  const key = raw.toLowerCase().trim();
  return PERSONA_KEYS.includes(key) ? key : 'default';
}

describe('chat persona allow-list', () => {
  it('accepts every documented persona', () => {
    for (const p of PERSONA_KEYS) {
      expect(resolvePersona(p)).toBe(p);
    }
  });

  it('normalises case and whitespace', () => {
    expect(resolvePersona('  RECRUITER  ')).toBe('recruiter');
    expect(resolvePersona('Aerospace')).toBe('aerospace');
  });

  it('falls back to default for unknown values', () => {
    expect(resolvePersona('admin')).toBe('default');
    expect(resolvePersona('SYSTEM_PROMPT')).toBe('default');
    expect(resolvePersona('<script>alert(1)</script>')).toBe('default');
  });

  it('falls back to default for non-strings', () => {
    expect(resolvePersona(undefined)).toBe('default');
    expect(resolvePersona(null)).toBe('default');
    expect(resolvePersona(42)).toBe('default');
    expect(resolvePersona({ recruiter: true })).toBe('default');
    expect(resolvePersona(['recruiter'])).toBe('default');
  });
});
