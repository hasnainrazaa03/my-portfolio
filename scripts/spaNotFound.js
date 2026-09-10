/**
 * spaNotFound.js — emit dist/404.html so an unknown path gets a real 404.
 *
 * Every real route is a file in the build (scripts/routeHeads.js), so any
 * other path misses the filesystem. Vercel then serves `404.html` from the
 * output directory — with a 404 status — if one exists.
 *
 * It is the built index.html with only its <head> changed, so the app boots on
 * it, sees the unknown pathname and renders its own not-found page — same
 * shell, same theme bootstrap, same CSP-pinned inline scripts, no second
 * template to keep in step. It is written AFTER the bundle, because only then
 * does index.html carry the hashed asset names.
 *
 * The head matters: a straight copy made every 404 response claim
 * `<title>Hasnain Raza | Portfolio</title>` and, worse,
 * `<link rel="canonical" href="…/">`, i.e. every dead URL told crawlers it was
 * the home page under another name. That is the soft 404 this module exists to
 * remove, reintroduced one layer down. NotFoundPage sets `noindex` at runtime,
 * but the whole premise here is that scrapers do not run the script.
 *
 * Before this a catch-all rewrite sent every unknown path to the shell with a
 * 200 — the home page under the wrong URL, which crawlers record as a soft
 * 404.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderRouteHead } from './routeHeads.js';

/** `path: null` — this file answers for every unknown URL, so it claims none. */
export const NOT_FOUND_HEAD = {
  path: null,
  title: 'Page not found | Hasnain Raza',
  description: 'That page does not exist. The address may be mistyped, or the link is out of date.',
  type: 'website',
};

/** @returns {import('vite').Plugin} */
export function spaNotFoundPage({ origin }) {
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
      const html = renderRouteHead(readFileSync(index, 'utf8'), NOT_FOUND_HEAD, { origin });
      writeFileSync(resolve(outDir, '404.html'), html);
    },
  };
}
