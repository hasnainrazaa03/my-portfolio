/**
 * lighthouseConfig.test.js — the Lighthouse gate must gate on the site.
 *
 * The previous gate read as sensible and failed on every run it ever made:
 * thresholds passed as CLI flags that never took effect, a preset that
 * asserted CPU-bound audits as errors (a shared runner scores 0 on those no
 * matter what the site does), and a trigger that only ran on pull requests —
 * so the only code it ever tested was Dependabot's, all of which it failed,
 * and eight dependency PRs sat untouched for a month.
 *
 * These pin the properties that make the gate trustworthy.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const rc = JSON.parse(readFileSync(resolve(root, 'lighthouserc.json'), 'utf8')).ci;
const workflow = readFileSync(resolve(root, '.github/workflows/lighthouse.yml'), 'utf8');
const assertions = rc.assert.assertions;

describe('lighthouserc.json', () => {
  it('uses no preset, so nothing CPU-bound is asserted as an error behind our backs', () => {
    expect(rc.assert.preset).toBeUndefined();
  });

  it('gates hard on the categories a CI runner measures deterministically', () => {
    for (const cat of ['accessibility', 'best-practices', 'seo']) {
      const [level, { minScore }] = assertions[`categories:${cat}`];
      expect(level, cat).toBe('error');
      expect(minScore, cat).toBeGreaterThanOrEqual(0.9);
    }
  });

  it('only WARNS on performance — runner CPU noise makes it a bad gate', () => {
    expect(assertions['categories:performance'][0]).toBe('warn');
  });

  it('never asserts a CPU-bound audit as an error', () => {
    for (const id of ['mainthread-work-breakdown', 'max-potential-fid', 'bootup-time', 'total-blocking-time']) {
      const a = assertions[id];
      if (a) expect(a[0], id).not.toBe('error');
    }
  });

  it('audits more than the home page, including a stand-alone route and a case study', () => {
    const paths = rc.collect.url.map((u) => new URL(u).pathname);
    expect(paths).toContain('/');
    expect(paths).toContain('/resume');
    expect(paths.some((p) => p.startsWith('/projects/'))).toBe(true);
  });

  it('serves with vite preview, which maps /resume to resume.html like production', () => {
    // staticDistDir serves files literally: /resume.html would boot the app at
    // a pathname it does not route, and the audit would score the 404 page.
    expect(rc.collect.staticDistDir).toBeUndefined();
    expect(rc.collect.startServerCommand).toMatch(/preview/);
  });
});

describe('lighthouse.yml', () => {
  it('runs on pushes to main, where the real work lands', () => {
    expect(workflow).toMatch(/push:\s*\n\s*branches:\s*\[main\]/);
  });

  it('keeps its assertions in lighthouserc.json, not in flags that silently do not apply', () => {
    expect(workflow).not.toMatch(/--assert\./);
    expect(workflow).toMatch(/lhci\/cli@[\d.]+ autorun\s*$/m);
  });

  it('builds with the placeholder DSN, so the audited bundle matches production', () => {
    expect(workflow).toMatch(/VITE_SENTRY_DSN:/);
  });
});
