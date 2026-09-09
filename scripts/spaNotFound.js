/**
 * spaNotFound.js — emit dist/404.html so an unknown path gets a real 404.
 *
 * The rewrite in vercel.json names the client routes and nothing else, so any
 * other path falls through to the filesystem and misses. Vercel then serves
 * `404.html` from the output directory — with a 404 status — if one exists.
 *
 * Making that file a byte-for-byte copy of the built index.html means the app
 * boots on it, sees the unknown pathname and renders its own not-found page:
 * the same shell, theme bootstrap and CSP-pinned inline scripts as every other
 * route, with no second template to keep in step. It has to be copied AFTER
 * the bundle is written, because only then does index.html carry the hashed
 * asset names.
 *
 * Before this the rewrite was a catch-all: every unknown path answered 200
 * with the home page under the wrong URL, which crawlers record as a soft 404.
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
