/**
 * projectData.js — read the project fields the build scripts need out of
 * `src/constants.ts`, without a TypeScript toolchain.
 *
 * WHY TEXT-PARSING AND NOT AN IMPORT: these scripts run as plain Node — from
 * npm scripts and from CI on Node 22 — where importing a `.ts` module means
 * either a loader flag that moves between Node versions or a build step before
 * the build step. `buildSitemap.js` already reads titles this way for the same
 * reason. The risk of parsing rather than importing is drift, so
 * `projectData.test.js` asserts every field here matches the real `PROJECTS`
 * array as Vitest (which does understand TS) sees it.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The `export const PROJECTS = [...]` block, as source text. */
function projectsBlock(source) {
  const start = source.indexOf('export const PROJECTS');
  if (start < 0) return '';
  const rest = source.slice(start);
  const end = rest.indexOf('\nexport const', 1);
  return end > 0 ? rest.slice(0, end) : rest;
}

/** Values of a `field: [ "a", "b" ]` array literal. */
function stringArray(entry, field) {
  const m = new RegExp(`${field}:\\s*\\[([^\\]]*)\\]`).exec(entry);
  return m ? [...m[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => x[1]) : [];
}

/** Value of a `field: "..."` string literal. */
function stringField(entry, field) {
  const m = new RegExp(`${field}:\\s*"((?:[^"\\\\]|\\\\.)*)"`).exec(entry);
  // `\"` inside the literal is the only escape used in this file.
  return m ? m[1].replace(/\\"/g, '"') : '';
}

/**
 * `[{ title, category, status, techStack, image }]` in declaration order.
 *
 * Entries are split on `id:` because titles and descriptions contain braces
 * and quotes; the id is the only reliable record separator in the source.
 */
export function readProjects(source = readFileSync(resolve(ROOT, 'src/constants.ts'), 'utf8')) {
  const block = projectsBlock(source);
  const starts = [...block.matchAll(/^\s*id:\s*\d+,/gm)].map((m) => m.index);
  return starts.map((start, i) => {
    const entry = block.slice(start, starts[i + 1] ?? block.length);
    return {
      title: stringField(entry, 'title'),
      category: stringField(entry, 'category'),
      status: stringField(entry, 'status'),
      techStack: stringArray(entry, 'techStack'),
      image: stringArray(entry, 'images')[0] ?? null,
    };
  });
}

/** Author identity for the card footer. Same source of truth as the site. */
export function readPersonalName(source = readFileSync(resolve(ROOT, 'src/constants.ts'), 'utf8')) {
  return /export const PERSONAL_INFO[\s\S]*?name:\s*"([^"]+)"/.exec(source)?.[1] ?? '';
}
