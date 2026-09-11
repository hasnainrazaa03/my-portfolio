/**
 * buildAppIcons.js — the PNG icons an installed app needs.
 *
 * The site's favicon is an inline SVG data URI, which is right for a browser
 * tab and useless for an install prompt: Android and Chrome want real PNGs at
 * known sizes, and a `maskable` variant they can crop to whatever shape the
 * launcher uses. A maskable icon is cropped to a circle on most Android
 * launchers, so its artwork has to sit inside the middle ~80% or the rocket
 * loses its nose.
 *
 * Committed rather than generated at deploy time, and checked in CI by
 * comparing a fingerprint — same reasoning as `buildOgCards.js`: rendering
 * needs a browser, which Vercel's build does not have.
 *
 * Usage:
 *   node scripts/buildAppIcons.js            # regenerate
 *   node scripts/buildAppIcons.js --check    # fail if stale (CI)
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// NOT public/icons — that directory already holds the self-hosted devicon
// set for the skills grid, and mixing install artwork into it makes both
// harder to reason about.
const OUT_DIR = join(ROOT, 'public/app-icons');
const MANIFEST = join(OUT_DIR, 'manifest.json');

/** Bump when the artwork changes, so every icon regenerates. */
export const ICON_VERSION = 1;

/** Matches the dark page background, so the icon does not sit on a white square. */
export const BACKGROUND = '#030014';
export const BRAND = '#2DD4BF';

/**
 * `purpose: "any"` icons are shown as drawn. `maskable` ones are cropped by
 * the launcher, so they carry more padding and a full-bleed background.
 */
export const ICONS = [
  { file: 'icon-192.png', size: 192, purpose: 'any', pad: 0.18 },
  { file: 'icon-512.png', size: 512, purpose: 'any', pad: 0.18 },
  { file: 'icon-maskable-512.png', size: 512, purpose: 'maskable', pad: 0.3 },
  // Apple ignores the manifest and reads this one from a <link> tag.
  { file: 'apple-touch-icon.png', size: 180, purpose: 'any', pad: 0.16 },
];

export function fingerprint() {
  return createHash('sha256')
    .update(JSON.stringify({ v: ICON_VERSION, BACKGROUND, BRAND, ICONS }))
    .digest('hex')
    .slice(0, 16);
}

/** The rocket mark, matching the favicon in index.html. */
export function iconHtml({ size, pad }) {
  const inset = Math.round(size * pad);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:${size}px;height:${size}px;background:${BACKGROUND};display:flex;align-items:center;justify-content:center;
  background-image:radial-gradient(${size}px ${size}px at 30% 20%, rgba(45,212,191,.22), transparent 70%)}
svg{width:${size - inset * 2}px;height:${size - inset * 2}px}
</style></head><body>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${BRAND}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
<path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
<path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
<path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
</svg></body></html>`;
}

export function staleness() {
  const expected = fingerprint();
  const missing = ICONS.filter((i) => !existsSync(join(OUT_DIR, i.file))).map((i) => i.file);
  let recorded = null;
  try {
    recorded = JSON.parse(readFileSync(MANIFEST, 'utf8')).fingerprint;
  } catch {
    /* no manifest yet */
  }
  return { missing, changed: recorded !== expected, expected };
}

async function main() {
  const check = process.argv.includes('--check');
  const { missing, changed, expected } = staleness();

  if (check) {
    if (missing.length || changed) {
      console.error(
        'App icons are out of date.' +
          (missing.length ? `\n  missing: ${missing.join(', ')}` : '') +
          (changed ? '\n  artwork or sizes changed' : '') +
          '\n  regenerate with: npm run icons:build',
      );
      process.exit(1);
    }
    console.log(`App icons are current (${ICONS.length}).`);
    return;
  }

  const { chromium } = await import('@playwright/test');
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  for (const icon of ICONS) {
    const page = await browser.newPage({ viewport: { width: icon.size, height: icon.size } });
    await page.setContent(iconHtml(icon), { waitUntil: 'load' });
    await page.screenshot({ path: join(OUT_DIR, icon.file) });
    await page.close();
    console.log(`  ${icon.file} (${icon.size}px, ${icon.purpose})`);
  }
  await browser.close();

  writeFileSync(MANIFEST, `${JSON.stringify({ version: ICON_VERSION, fingerprint: expected }, null, 2)}\n`);
  console.log(`Wrote ${ICONS.length} icons + manifest.json`);
}

if (process.argv[1] && process.argv[1].endsWith('buildAppIcons.js')) await main();
