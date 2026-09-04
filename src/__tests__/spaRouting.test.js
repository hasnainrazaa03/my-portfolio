/**
 * spaRouting.test.js — client routes need a server-side fallback.
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
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const config = JSON.parse(readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8'));

describe('vercel.json', () => {
  it('declares an SPA fallback', () => {
    expect(config.rewrites, 'client routes 404 without a rewrite').toBeDefined();
    expect(config.rewrites.length).toBeGreaterThan(0);
  });

  it('sends unmatched paths to index.html', () => {
    const spa = config.rewrites.find((r) => r.destination === '/index.html');
    expect(spa, 'no rewrite targets index.html').toBeTruthy();
  });

  it('does NOT swallow the API routes', () => {
    // A bare /(.*) catch-all would shadow the serverless functions.
    const spa = config.rewrites.find((r) => r.destination === '/index.html');
    const re = new RegExp(`^${spa.source}$`);
    expect(re.test('/api/chat'), '/api/chat must not rewrite to index.html').toBe(false);
    expect(re.test('/api/analytics')).toBe(false);
  });

  it('does cover the client routes that need it', () => {
    const spa = config.rewrites.find((r) => r.destination === '/index.html');
    const re = new RegExp(`^${spa.source}$`);
    for (const path of ['/resume', '/privacy', '/projects/project-vimaan']) {
      expect(re.test(path), `${path} needs the fallback`).toBe(true);
    }
  });
});
