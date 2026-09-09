/**
 * spaNotFound.js — emit dist/404.html so an unknown path gets a real 404.
 *
 * Every real route is a file in the build (scripts/routeHeads.js), so any
 * other path misses the filesystem. Vercel then serves `404.html` from the
 * output directory — with a 404 status — if one exists.
 *
 * Making that file a byte-for-byte copy of the built index.html means the app
 * boots on it, sees the unknown pathname and renders its own not-found page:
 * the same shell, theme bootstrap and CSP-pinned inline scripts as every other
 * route, with no second template to keep in step. It has to be copied AFTER
 * the bundle is written, because only then does index.html carry the hashed
 * asset names.
 *
 * Before this a catch-all rewrite sent every unknown path to the shell with a
 * 200 — the home page under the wrong URL, which crawlers record as a soft
 * 404.
 */
import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** @returns {import('vite').Plugin} */
export function spaNotFoundPage() {
  let outDir = '';
  return {
    name: 'spa-not-found-page',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const index = resolve(outDir, 'index.html');
      if (!existsSync(index)) return;
      copyFileSync(index, resolve(outDir, '404.html'));
    },
  };
}
