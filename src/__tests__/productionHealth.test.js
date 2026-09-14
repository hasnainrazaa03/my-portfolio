/**
 * productionHealth.test.js — the daily check of the live site.
 *
 * Tests the freshness logic (which decides whether a mismatch between
 * production and main is a real skipped deploy or just one in progress) and
 * pins the workflow properties that make the check trustworthy.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { assessFreshness } from '../../scripts/deployFreshness.js';

const root = process.cwd();
const A = 'a'.repeat(40);
const B = 'b'.repeat(40);
const now = new Date('2026-09-15T14:17:00Z');
const minutesAgo = (m) => new Date(now.getTime() - m * 60_000).toISOString();

describe('assessFreshness', () => {
  it('passes when production is on main HEAD', () => {
    expect(assessFreshness({ prodSha: A, headSha: A, headPushedAt: minutesAgo(600), now }).ok).toBe(true);
  });

  it('tolerates a mismatch while a recent push may still be deploying', () => {
    const r = assessFreshness({ prodSha: A, headSha: B, headPushedAt: minutesAgo(5), now, graceMinutes: 30 });
    expect(r.ok).toBe(true);
    expect(r.message).toMatch(/may still be deploying/);
  });

  it('FAILS when main has moved on and production has not — the skipped-deploy case', () => {
    const r = assessFreshness({ prodSha: A, headSha: B, headPushedAt: minutesAgo(90), now, graceMinutes: 30 });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/production serves aaaaaaa but main has been at bbbbbbb for 90 min/);
    expect(r.message).toMatch(/redeploy/);
  });

  it('fails, with the fix, when production reports no commit at all', () => {
    const r = assessFreshness({ prodSha: null, headSha: B, headPushedAt: minutesAgo(90), now });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/VERCEL_GIT_COMMIT_SHA/);
  });

  it('fails rather than guesses when the push time is unknown', () => {
    expect(assessFreshness({ prodSha: A, headSha: B, headPushedAt: 'not a date', now }).ok).toBe(false);
  });

  it('treats the grace boundary as still deploying, one minute past it as failed', () => {
    expect(assessFreshness({ prodSha: A, headSha: B, headPushedAt: minutesAgo(29), now, graceMinutes: 30 }).ok).toBe(true);
    expect(assessFreshness({ prodSha: A, headSha: B, headPushedAt: minutesAgo(31), now, graceMinutes: 30 }).ok).toBe(false);
  });
});

describe('the workflow', () => {
  const wf = readFileSync(resolve(root, '.github/workflows/production.yml'), 'utf8');

  it('runs on a daily schedule, off the hour, and on demand', () => {
    expect(wf).toMatch(/cron: '(\d{1,2}) \d{1,2} \* \* \*'/);
    expect(wf).not.toMatch(/cron: '0 /);
    expect(wf).toMatch(/workflow_dispatch:/);
  });

  it('points the E2E suite at production', () => {
    expect(wf).toMatch(/E2E_BASE_URL: \$\{\{ env\.SITE \}\}/);
    expect(wf).toMatch(/SITE: https:\/\/hasnainrazaa\.vercel\.app/);
  });

  it('checks deploy freshness against main', () => {
    expect(wf).toMatch(/node scripts\/deployFreshness\.js/);
    expect(wf).toMatch(/\/api\/health/);
  });

  it('turns a failure into an issue someone is notified about, and closes it on recovery', () => {
    expect(wf).toMatch(/issues: write/);
    expect(wf).toMatch(/gh issue create/);
    expect(wf).toMatch(/gh issue close/);
    expect(wf).toMatch(/if: always\(\)/);
  });
});

describe('the suite is safe to run against production', () => {
  const fixtures = readFileSync(resolve(root, 'e2e/fixtures.ts'), 'utf8');

  it('blocks the analytics beacon and forbids unmocked paid API calls', () => {
    expect(fixtures).toMatch(/_vercel\/insights/);
    expect(fixtures).toMatch(/api\\\/\(chat\|fit\)/);
    expect(fixtures).toMatch(/auto: true/);
  });

  it('is what every spec imports — a spec importing @playwright/test directly skips the guards', async () => {
    const { readdirSync } = await import('node:fs');
    for (const f of readdirSync(resolve(root, 'e2e')).filter((n) => n.endsWith('.spec.ts'))) {
      const src = readFileSync(resolve(root, 'e2e', f), 'utf8');
      expect(src, f).toMatch(/from '\.\/fixtures'/);
      expect(src, f).not.toMatch(/from '@playwright\/test'/);
    }
  });

  it('health reports the deployed commit', () => {
    expect(readFileSync(resolve(root, 'api/health.ts'), 'utf8')).toMatch(/commit: process\.env\.VERCEL_GIT_COMMIT_SHA/);
  });
});
