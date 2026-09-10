/**
 * spaRouting.test.js — every client route must exist as a file in the build.
 *
 * `/resume`, `/privacy` and every `/projects/<slug>` are resolved in the
 * browser by App's pathname routing, so a direct visit or a shared link only
 * works if the host has something to serve at that path. It did not: all
 * three families returned 404 in production until 2026-09-04, while
 * `vite preview` (which has its own SPA fallback) made every local check
 * pass — the divergence only existed in production.
 *
 * The first fix was a catch-all rewrite to index.html, which over-corrected:
 * every unknown path answered 200 with the home page under the wrong URL, a
 * soft 404 to crawlers. Then a rewrite naming just the routes. Now there is
 * no rewrite at all: scripts/routeHeads.js writes one HTML file per route,
 * Vercel serves it extensionless (cleanUrls), and anything else falls to
 * dist/404.html with a real 404 — a stale project slug included.
 *
 * So the contract is: the set of paths App routes on equals the set of files
 * the build emits. This holds the two together.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { routeHeads } from '../utils/routeMeta';
import { projectPath } from '../utils/slug';
import { PROJECTS } from '../constants';

const root = process.cwd();
const config = JSON.parse(readFileSync(resolve(root, 'vercel.json'), 'utf8'));
const app = readFileSync(resolve(root, 'src/App.tsx'), 'utf8');
const emitted = new Set(routeHeads().map((r) => r.path));

describe('vercel.json', () => {
  it('serves the per-route files at their extensionless paths', () => {
    expect(config.cleanUrls, 'dist/resume.html is only reachable at /resume with cleanUrls').toBe(true);
    expect(config.trailingSlash, 'one URL per page').toBe(false);
  });

  it('has no rewrite to the shell', () => {
    // Under cleanUrls a destination of /index.html does not resolve, so such a
    // rewrite would be dead config that READS as if unknown slugs got the
    // shell with a 200. They get 404.html with a 404, which is the intent.
    const toShell = (config.rewrites ?? []).filter((r) => /index\.html$|^\/$/.test(r.destination));
    expect(toShell).toEqual([]);
  });
});

describe('App routes and built files agree', () => {
  it('every literal path App routes on is emitted as a file', () => {
    const literals = [...app.matchAll(/path === '([^']+)'/g)].map((m) => m[1]);
    expect(literals.length, 'App no longer routes on path literals?').toBeGreaterThan(0);
    for (const literal of literals) {
      const path = literal.replace(/\/$/, '') || '/';
      if (path === '/' || path === '/index.html') continue; // the shell itself
      expect(emitted.has(path), `App routes on '${literal}' but the build emits no ${path}.html`).toBe(true);
    }
  });

  it('every project App can render is emitted as a file', () => {
    for (const p of PROJECTS) {
      expect(emitted.has(projectPath(p.title)), p.title).toBe(true);
    }
  });

  it('emits nothing App would not render', () => {
    const known = new Set(['/resume', '/privacy', '/fit', ...PROJECTS.map((p) => projectPath(p.title))]);
    for (const path of emitted) {
      expect(known.has(path), `${path} is emitted but App has no route for it`).toBe(true);
    }
  });
});
