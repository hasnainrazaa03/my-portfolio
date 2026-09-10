/**
 * buildOgCards.js — generate a social card for each project that needs one.
 *
 * A shared /projects/<slug> link previews with whatever `og:image` its head
 * declares. Where a project ships artwork that works as a card — wide enough,
 * landscape, croppable to 1.91:1 — that artwork is the best possible preview
 * and this script leaves it alone. Where it does not (a 3.6:1 banner loses its
 * sides, a 331x383 thumbnail renders as a postage stamp), the alternative used
 * to be the generic site card, so three different projects previewed
 * identically and the link told the reader nothing.
 *
 * So this renders a titled card for exactly those projects. `routeMeta.ts`
 * decides which; `--check` fails when a card is missing or its inputs changed.
 *
 * WHY COMMITTED, NOT BUILT ON DEPLOY: rendering needs a browser. Playwright is
 * a devDependency here but its binaries are not installed on Vercel, and
 * pulling ~150 MB of Chromium into every production build to regenerate seven
 * static images that change once a year is a bad trade. The cards are checked
 * in; `og:check` (no browser needed — it compares a fingerprint of the inputs)
 * runs in CI so a project rename cannot silently leave a stale card behind.
 *
 * Usage:
 *   node scripts/buildOgCards.js            # regenerate
 *   node scripts/buildOgCards.js --check    # fail if stale (CI)
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readProjects, readPersonalName } from './projectData.js';
import { imageWorksAsCard } from './routeHeads.js';
import { toSlug } from './buildSitemap.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public/og');
const MANIFEST = join(OUT_DIR, 'manifest.json');

/** Bump when the template changes, so every card regenerates. */
export const TEMPLATE_VERSION = 2;

/**
 * JPEG, not PNG. The card is a smooth two-colour gradient behind text, which
 * is the worst case for PNG's palette: 183 KB as PNG against 49 KB at quality
 * 90, with no difference visible at the size a timeline renders it. Every
 * scraper accepts JPEG.
 */
export const CARD_FORMAT = { ext: 'jpg', type: 'jpeg', quality: 90 };

/** Shown in the card footer. Mirrors SITE_ORIGIN in src/utils/routeMeta.ts. */
export const SITE_HOST = 'hasnainrazaa.vercel.app';

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

/**
 * Everything the rendered card depends on. `--check` compares this, which is
 * why it needs no browser: a renamed project or a reordered stack changes the
 * hash and CI fails with an actionable message.
 */
export function fingerprint(card) {
  return createHash('sha256')
    .update(JSON.stringify({ v: TEMPLATE_VERSION, ...card }))
    .digest('hex')
    .slice(0, 16);
}

const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * The card markup. Deliberately self-contained — one inline <style>, the font
 * embedded as a data URI — so rendering never depends on a server or network.
 */
export function cardHtml({ title, category, tech, name, site, fontDataUri }) {
  const chips = tech
    .slice(0, 5)
    .map((t) => `<li>${escapeHtml(t)}</li>`)
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:'Inter';font-style:normal;font-weight:400 700;src:url(${fontDataUri}) format('woff2-variations')}
*{margin:0;padding:0;box-sizing:border-box}
body{width:${CARD_WIDTH}px;height:${CARD_HEIGHT}px;overflow:hidden;
  font-family:'Inter',system-ui,sans-serif;background:#030014;color:#fff;
  /* Two off-centre glows echo the site's hero rather than a flat panel. */
  background-image:radial-gradient(900px 520px at 82% 8%, rgba(45,212,191,.20), transparent 60%),
                   radial-gradient(760px 520px at 8% 100%, rgba(124,58,237,.22), transparent 62%)}
.card{height:100%;padding:64px 72px;display:flex;flex-direction:column}
/* The block is centred rather than pinned to the top: a three-line title fills
   the card on its own, while a two-word one would otherwise leave a band of
   dead space above the footer. */
.main{flex:1;display:flex;flex-direction:column;justify-content:center;min-height:0}
.chip{display:inline-block;font-size:22px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;
  color:#2DD4BF;border:2px solid rgba(45,212,191,.42);background:rgba(45,212,191,.10);
  padding:10px 22px;border-radius:999px}
h1{font-size:68px;line-height:1.08;font-weight:700;letter-spacing:-.022em;margin:34px 0 0;
  /* Long titles must shrink the block, never spill off the card. */
  display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
ul{list-style:none;display:flex;flex-wrap:wrap;gap:12px;margin-top:30px;max-height:104px;overflow:hidden}
li{font-size:21px;font-weight:500;color:#CBD5E1;background:rgba(255,255,255,.07);
  border:1px solid rgba(255,255,255,.13);padding:9px 18px;border-radius:10px;white-space:nowrap}
footer{display:flex;align-items:center;justify-content:space-between;
  border-top:1px solid rgba(255,255,255,.13);padding-top:26px}
.who{font-size:27px;font-weight:700}
.where{font-size:22px;font-weight:500;color:#2DD4BF}
</style></head><body><div class="card">
<div class="main"><div><span class="chip">${escapeHtml(category)}</span></div><h1>${escapeHtml(title)}</h1><ul>${chips}</ul></div>
<footer><span class="who">${escapeHtml(name)}</span><span class="where">${escapeHtml(site)}</span></footer>
</div></body></html>`;
}

/** Read the committed manifest, or an empty one. */
function readManifest() {
  try {
    return JSON.parse(readFileSync(MANIFEST, 'utf8'));
  } catch {
    return { cards: {} };
  }
}

export function staleness(cards, manifest) {
  const expected = Object.fromEntries(cards.map((c) => [c.slug, fingerprint(c)]));
  const missing = [];
  const changed = [];
  for (const [slug, fp] of Object.entries(expected)) {
    if (!existsSync(join(OUT_DIR, `${slug}.${CARD_FORMAT.ext}`))) missing.push(slug);
    else if (manifest.cards?.[slug] !== fp) changed.push(slug);
  }
  const orphaned = Object.keys(manifest.cards ?? {}).filter((slug) => !(slug in expected));
  return { missing, changed, orphaned, expected };
}

/**
 * The projects that need a generated card: those whose own artwork is missing
 * or the wrong shape to crop to 1.91:1. Uses the same predicate the <head>
 * generator uses to pick between them, so the two cannot disagree.
 */
export function cardsToGenerate(publicDir = join(ROOT, 'public')) {
  return readProjects()
    .filter((p) => !imageWorksAsCard(publicDir, p.image))
    .map((p) => ({
      slug: toSlug(p.title),
      title: p.title,
      category: p.category,
      tech: p.techStack,
    }));
}

async function main() {
  const check = process.argv.includes('--check');
  const name = readPersonalName();
  const cards = cardsToGenerate();
  const manifest = readManifest();
  const { missing, changed, orphaned, expected } = staleness(cards, manifest);

  if (check) {
    if (missing.length || changed.length || orphaned.length) {
      console.error(
        'Social cards are out of date.' +
          (missing.length ? `\n  missing: ${missing.join(', ')}` : '') +
          (changed.length ? `\n  stale:   ${changed.join(', ')}` : '') +
          (orphaned.length ? `\n  orphan:  ${orphaned.join(', ')}` : '') +
          '\n  regenerate with: npm run og:build',
      );
      process.exit(1);
    }
    console.log(`Social cards are current (${cards.length}).`);
    return;
  }

  // Imported here, not at module scope: `--check` runs in CI and must not need
  // a browser binary just to compare hashes.
  const { chromium } = await import('@playwright/test');
  const fontDataUri = `data:font/woff2;base64,${readFileSync(join(ROOT, 'public/fonts/inter-var-latin.woff2')).toString('base64')}`;
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  // deviceScaleFactor 1: the card IS 1200x630, the size scrapers expect.
  const page = await browser.newPage({ viewport: { width: CARD_WIDTH, height: CARD_HEIGHT } });
  for (const card of cards) {
    await page.setContent(cardHtml({ ...card, name, site: SITE_HOST, fontDataUri }), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: join(OUT_DIR, `${card.slug}.${CARD_FORMAT.ext}`),
      type: CARD_FORMAT.type,
      quality: CARD_FORMAT.quality,
    });
    console.log(`  ${card.slug}.${CARD_FORMAT.ext}`);
  }
  await browser.close();

  // Drop cards for projects that no longer exist, so the directory cannot grow
  // a tail of images nothing references.
  for (const file of readdirSync(OUT_DIR)) {
    const slug = file.replace(new RegExp(`\\.${CARD_FORMAT.ext}$`), '');
    if (file.endsWith(`.${CARD_FORMAT.ext}`) && !(slug in expected)) {
      unlinkSync(join(OUT_DIR, file));
      console.log(`  removed orphan ${file}`);
    }
  }

  writeFileSync(MANIFEST, `${JSON.stringify({ templateVersion: TEMPLATE_VERSION, cards: expected }, null, 2)}\n`);
  console.log(`Wrote ${cards.length} cards + manifest.json`);
}

if (process.argv[1] && process.argv[1].endsWith('buildOgCards.js')) await main();
