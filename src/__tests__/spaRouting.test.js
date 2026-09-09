/**
 * spaRouting.test.js — client routes need a server-side fallback, and
 * nothing else should get one.
 *
 * `/resume`, `/privacy` and every `/projects/<slug>` are resolved in the
 * browser by App's pathname routing. Nothing exists on disk at those paths, so
 * a direct visit or a shared link depends entirely on the host rewriting them
 * to index.html.
 *
 * A comment in App.tsx asserted Vercel did this by default. It did not: all
 * three route families returned 404 in production, and the sitemap had been
 * advertising two of them to crawlers. Nothing caught it because every local
 * check uses `vite preview`, which HAS an SPA fallback — the divergence only
 * existed in production.
 *
 * The first fix was a catch-all, which over-corrected: every unknown path — a
 * mistyped URL, a deleted asset — answered 200 with the home page under the
 * wrong address, a soft 404 to crawlers. The rewrite now names the routes and
 * nothing else; everything unknown falls through to dist/404.html
 * (scripts/spaNotFound.js) with a real 404 status.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const config = JSON.parse(readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8'));
const spa = config.rewrites?.find((r) => r.destination === '/index.html');
// Vercel compiles `source` with path-to-regexp; for a single regex group this
// anchored RegExp is the same test.
const matches = (path) => new RegExp(`^${spa.source}$`).test(path);

describe('vercel.json', () => {
  it('declares an SPA fallback that targets index.html', () => {
    expect(config.rewrites, 'client routes 404 without a rewrite').toBeDefined();
    expect(spa, 'no rewrite targets index.html').toBeTruthy();
  });

  it('covers every client route, with or without a trailing slash', () => {
    for (const path of [
      '/resume',
      '/resume/',
      '/privacy',
      '/privacy/',
      '/projects/project-vimaan',
      '/projects/project-vimaan/',
      '/projects/brain-tumor-segmentation-brats-2021-vision-transformer',
    ]) {
      expect(matches(path), `${path} needs the fallback`).toBe(true);
    }
  });

  it('leaves the home page to the filesystem', () => {
    // `/` IS index.html; it never needed a rewrite and must not depend on
    // one — it is the path Vercel serves with no configuration at all.
    expect(matches('/')).toBe(false);
  });

  it('does NOT swallow the API routes', () => {
    expect(matches('/api/chat'), '/api/chat must not rewrite to index.html').toBe(false);
    expect(matches('/api/analytics')).toBe(false);
  });

  it('does NOT swallow missing FILES — that would be a soft 404', () => {
    // A catch-all made every deleted or mistyped asset return the SPA shell
    // with HTTP 200: /peakroutine.svg, removed in the same session, answered
    // 200 with HTML. Broken links then look fine to crawlers and to us, and an
    // <img> fails with no status to explain why.
    for (const path of [
      '/peakroutine.svg',
      '/assets/index-abc12345.js',
      '/resume.pdf',
      '/sitemap.xml',
      '/robots.txt',
      '/projects/cover.png',
    ]) {
      expect(matches(path), `${path} must 404 when absent, not rewrite`).toBe(false);
    }
  });

  it('does NOT swallow unknown paths — they get the real 404 page', () => {
    for (const path of ['/nope', '/admin', '/resume/extra', '/projects', '/projects/', '/projects/a/b']) {
      expect(matches(path), `${path} must reach 404.html, not the shell`).toBe(false);
    }
  });
});
