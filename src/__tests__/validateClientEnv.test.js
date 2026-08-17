/**
 * validateClientEnv.test.js — the build-time guard on client env vars.
 *
 * Pins the bug this was written for: production shipped
 * VITE_ANALYTICS_WRITE_TOKEN as 64 U+2022 BULLET characters, because the value
 * was copied out of Vercel's masked *display* rather than from the original.
 * Every presence check passed (non-empty, plausible length) and analytics
 * silently 401'd for every visitor.
 */
import { describe, it, expect } from 'vitest';
import { findEnvProblems, validateClientEnv } from '../../scripts/validateClientEnv.js';

const MASKED = '•'.repeat(64);

describe('findEnvProblems', () => {
  it('flags a value that is entirely bullet characters', () => {
    const problems = findEnvProblems({ VITE_ANALYTICS_WRITE_TOKEN: MASKED });
    expect(problems).toHaveLength(1);
    expect(problems[0].key).toBe('VITE_ANALYTICS_WRITE_TOKEN');
    expect(problems[0].fatal).toBe(true);
    expect(problems[0].message).toMatch(/64 mask characters/);
  });

  it.each([
    ['middle dot', '·'],
    ['black circle', '●'],
    ['black small square', '▪'],
    ['bullet operator', '∙'],
    ['asterisk', '*'],
  ])('flags a value masked with %s', (_label, ch) => {
    expect(findEnvProblems({ VITE_TOKEN: ch.repeat(32) })).toHaveLength(1);
  });

  it('accepts real values', () => {
    expect(
      findEnvProblems({
        VITE_ANALYTICS_WRITE_TOKEN: 'a3f8'.repeat(16),
        VITE_SENTRY_DSN: 'https://abc@o1.ingest.us.sentry.io/2',
        VITE_EMAILJS_PUBLIC_KEY: 'user_AbC123',
        VITE_ENABLE_ADMIN: 'true',
      }),
    ).toEqual([]);
  });

  it('does not flag a value that merely contains an asterisk or bullet', () => {
    // A wildcard origin or a token with a stray * is not a masked value.
    expect(findEnvProblems({ VITE_ORIGIN: 'https://*.example.com' })).toEqual([]);
  });

  it('flags surrounding whitespace — a stray newline from a paste', () => {
    const problems = findEnvProblems({ VITE_SENTRY_DSN: 'https://abc@o1.ingest.us.sentry.io/2\n' });
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toMatch(/whitespace/);
  });

  it('does NOT flag whitespace on platform-injected VITE_VERCEL_* variables', () => {
    // This exact value failed a real production deploy: Vercel injects the
    // commit message as an env var, Vite forwards every VITE_-prefixed value to
    // the build, and multi-line commit messages end in a newline. Nobody pasted
    // anything — the rule simply did not apply.
    expect(
      findEnvProblems({
        VITE_VERCEL_GIT_COMMIT_MESSAGE: 'feat: a thing\n\nWith a body paragraph.\n',
      }),
    ).toEqual([]);
  });

  it('does NOT flag a genuinely multi-line value', () => {
    // A newline inside the value is content, not a paste artifact.
    expect(findEnvProblems({ VITE_NOTE: 'line one\nline two\n' })).toEqual([]);
  });

  it('still flags whitespace on an ordinary single-line variable', () => {
    expect(findEnvProblems({ VITE_TOKEN: 'abc123 ' })).toHaveLength(1);
  });

  it('still flags a masked platform variable — that rule always applies', () => {
    // Exempting platform vars from the whitespace heuristic must not exempt
    // them from the mask check, which is unambiguous wherever it fires.
    expect(findEnvProblems({ VITE_VERCEL_THING: '•'.repeat(32) })).toHaveLength(1);
  });

  it('ignores empty values — absence is a separate, already-handled concern', () => {
    expect(findEnvProblems({ VITE_ANALYTICS_WRITE_TOKEN: '', VITE_OTHER: undefined })).toEqual([]);
  });

  it('ignores non-VITE_ keys: the build cannot see server secrets anyway', () => {
    expect(findEnvProblems({ ANALYTICS_WRITE_TOKEN: MASKED, PATH: '/usr/bin' })).toEqual([]);
  });

  it('handles a missing env object', () => {
    expect(findEnvProblems(undefined)).toEqual([]);
  });
});

describe('validateClientEnv plugin', () => {
  const runConfig = (env) => {
    const plugin = validateClientEnv(() => env);
    return () => plugin.config({}, { mode: 'production' });
  };

  it('throws so the deploy fails rather than shipping a broken bundle', () => {
    expect(runConfig({ VITE_ANALYTICS_WRITE_TOKEN: MASKED })).toThrow(
      /Invalid client environment variables/,
    );
  });

  it('names the offending variable in the error', () => {
    expect(runConfig({ VITE_ANALYTICS_WRITE_TOKEN: MASKED })).toThrow(
      /VITE_ANALYTICS_WRITE_TOKEN/,
    );
  });

  it('passes clean env through untouched', () => {
    expect(runConfig({ VITE_SENTRY_DSN: 'https://abc@o1.ingest.us.sentry.io/2' })).not.toThrow();
  });
});
