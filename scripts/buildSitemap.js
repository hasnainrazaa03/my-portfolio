/**
 * buildSitemap.js — regenerate public/sitemap.xml from the real routes.
 *
 * The sitemap was hand-maintained and listed three URLs. Project case studies
 * are now routable, and a hand-kept list drifts the moment a project is added —
 * silently, because nothing renders it. Generating from `PROJECTS` means the
 * sitemap cannot disagree with the site.
 *
 * `--check` fails when the committed file is stale, so CI catches the drift
 * rather than a crawler finding it months later.
 *
 * Usage:  node scripts/buildSitemap.js [--check]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ORIGIN = 'https://hasnainrazaa.vercel.app';
const OUT = resolve(process.cwd(), 'public/sitemap.xml');

/** Read titles straight from constants.ts — no TS toolchain needed here. */
export function projectTitles(constantsSource) {
  const start = constantsSource.indexOf('export const PROJECTS');
  if (start < 0) return [];
  const rest = constantsSource.slice(start);
  const end = rest.indexOf('\nexport const', 1);
  const block = end > 0 ? rest.slice(0, end) : rest;
  return [...block.matchAll(/^\s*title:\s*"([^"]+)"/gm)].map((m) => m[1]);
}

/** Mirrors src/utils/slug.ts. Kept in step by sitemap.test.js. */
export function toSlug(title) {
  return String(title ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildSitemap(titles, today) {
  const entry = (loc, changefreq, priority) =>
    `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n` +
    `    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;

  const urls = [
    entry(`${ORIGIN}/`, 'monthly', '1.0'),
    entry(`${ORIGIN}/resume`, 'monthly', '0.8'),
    ...titles.map((t) => entry(`${ORIGIN}/projects/${toSlug(t)}`, 'monthly', '0.7')),
    entry(`${ORIGIN}/privacy`, 'yearly', '0.3'),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

function main() {
  const check = process.argv.includes('--check');
  const titles = projectTitles(readFileSync(resolve(process.cwd(), 'src/constants.ts'), 'utf8'));
  // Preserve the existing lastmod on a --check run so an unrelated date change
  // cannot fail CI; only the URL SET is what this guards.
  const existing = (() => {
    try {
      return readFileSync(OUT, 'utf8');
    } catch {
      return '';
    }
  })();
  const today = check
    ? (existing.match(/<lastmod>([\d-]+)<\/lastmod>/)?.[1] ?? new Date().toISOString().slice(0, 10))
    : new Date().toISOString().slice(0, 10);

  const xml = buildSitemap(titles, today);

  if (check) {
    const locs = (s) => [...s.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).sort();
    const a = locs(existing);
    const b = locs(xml);
    if (a.join('\n') !== b.join('\n')) {
      const missing = b.filter((u) => !a.includes(u));
      const extra = a.filter((u) => !b.includes(u));
      console.error(
        'sitemap.xml is out of date.' +
          (missing.length ? `\n  missing: ${missing.join(', ')}` : '') +
          (extra.length ? `\n  stale:   ${extra.join(', ')}` : '') +
          '\n  regenerate with: npm run sitemap:build',
      );
      process.exit(1);
    }
    console.log(`sitemap.xml is current (${b.length} URLs).`);
    return;
  }

  writeFileSync(OUT, xml);
  console.log(`Wrote ${OUT} — ${titles.length + 3} URLs`);
}

if (process.argv[1] && process.argv[1].endsWith('buildSitemap.js')) main();
