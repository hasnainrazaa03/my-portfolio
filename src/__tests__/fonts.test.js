/**
 * fonts.test.js — the site's declared font must actually ship.
 *
 * tailwind.config.js named Inter from the start and `font-sans` is applied at
 * the app root, but nothing ever loaded it: no @font-face, no <link>, no file
 * in the repo. Every visitor rendered in the next family down — Helvetica on
 * macOS, Arial on Windows, Roboto on Android. Nobody noticed because a missing
 * webfont degrades to something that looks perfectly fine, and because a
 * developer with Inter installed locally sees the intended design.
 *
 * So this asserts the whole chain — file, @font-face, preload, Tailwind stack,
 * CSP — rather than any one link in it.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const FONT = 'public/fonts/inter-var-latin.woff2';
const css = readFileSync(resolve(root, 'src/index.css'), 'utf8');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const tailwind = readFileSync(resolve(root, 'tailwind.config.js'), 'utf8');
const vercel = JSON.parse(readFileSync(resolve(root, 'vercel.json'), 'utf8'));

const fontFace = css.match(/@font-face\s*\{[^}]*\}/)?.[0] ?? '';

describe('the Inter file', () => {
  it('is committed and is really woff2', () => {
    const buf = readFileSync(resolve(root, FONT));
    // woff2 files start with the signature 'wOF2'.
    expect(buf.subarray(0, 4).toString('ascii')).toBe('wOF2');
  });

  it('stays within budget', () => {
    // 24,940 bytes today: one variable file, weights instanced to 400-700 and
    // subsetted to latin (scripts/buildInterSubset.sh). Google's stock latin
    // subset is 48,432 and four static instances would be 63,084. A large jump
    // here means the subsetting step was skipped.
    const bytes = statSync(resolve(root, FONT)).size;
    expect(bytes).toBeLessThanOrEqual(30 * 1024);
    expect(bytes).toBeGreaterThan(10 * 1024); // not a truncated/empty file
  });
});

describe('@font-face', () => {
  it('declares Inter over the weight range the UI uses', () => {
    expect(fontFace).toContain("font-family: 'Inter'");
    // 400 normal, 500 medium, 600 semibold, 700 bold all appear in the app.
    expect(fontFace).toMatch(/font-weight:\s*400 700/);
  });

  it('points at the file that is actually committed', () => {
    const src = fontFace.match(/url\('([^']+)'\)/)?.[1];
    expect(src).toBe(`/${FONT.replace('public/', '')}`);
  });

  it('uses swap so the font never blocks rendering', () => {
    expect(fontFace).toMatch(/font-display:\s*swap/);
  });
});

describe('delivery', () => {
  it('is NOT preloaded — measured, not assumed', () => {
    // The obvious move is `<link rel=preload as=font>`, and it was tried. It
    // cost 300ms of LCP: this is a client-rendered app, so the <h1> does not
    // exist until the entry chunk runs, and a high-priority font preload takes
    // bandwidth from exactly that JS on a throttled connection.
    //
    //   baseline (no font)  LCP 2.3s  score 97
    //   font + preload      LCP 2.6s  score 95
    //   font, no preload    LCP 2.3s  score 96
    //
    // `font-display: swap` already makes the font optional for rendering — the
    // heading paints in the fallback and re-renders when Inter lands — so the
    // preload was buying a marginally earlier swap at the cost of the metric
    // that matters. Restore it only alongside numbers that say otherwise.
    expect(html).not.toMatch(/<link[^>]*rel="preload"[^>]*as="font"/);
  });

  it('is cached immutably — the filename is stable, so the header is the cache key', () => {
    const rule = vercel.headers.find((h) => h.source.startsWith('/fonts/'));
    expect(rule, 'no cache header for /fonts/').toBeTruthy();
    expect(rule.headers.find((h) => h.key === 'Cache-Control').value).toMatch(/immutable/);
  });

  it('needs no third-party font origin in the CSP', () => {
    const csp = vercel.headers
      .flatMap((r) => r.headers)
      .find((h) => h.key === 'Content-Security-Policy').value;
    expect(csp).toMatch(/font-src [^;]*'self'/);
    // Self-hosting is the point: allowing Google's origins would let a future
    // <link> to them work silently, which is what this replaces.
    expect(csp).not.toContain('fonts.gstatic.com');
    expect(csp).not.toContain('fonts.googleapis.com');
  });
});

describe('the Tailwind stack', () => {
  const stack = tailwind.match(/sans:\s*\[([\s\S]*?)\]/)?.[1] ?? '';

  it('leads with Inter', () => {
    expect(stack.replace(/\s/g, '').startsWith("'Inter',")).toBe(true);
  });

  it('falls back to the platform UI font before the generic keyword', () => {
    // What renders during `swap`, and if the font request fails. Bare
    // `sans-serif` resolves to Helvetica/Arial; system-ui gets the good one.
    expect(stack).toContain('system-ui');
    expect(stack).toContain('-apple-system');
    expect(stack).toContain('Segoe UI');
    expect(stack.trimEnd().endsWith("'sans-serif',") || stack.includes("'sans-serif'")).toBe(true);
  });
});
