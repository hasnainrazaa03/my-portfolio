/**
 * routeHeads.test.js — every stand-alone route gets its own <head>.
 *
 * A single-page app serves one index.html for every URL, so every route
 * carried the home page's title, description, social tags and canonical link.
 * Shared on LinkedIn, a case study previewed as the portfolio; to a crawler,
 * every /projects/<slug> in the sitemap declared itself a duplicate of "/".
 * The build now writes dist/<route>.html per route (scripts/routeHeads.js)
 * from the list in src/utils/routeMeta.ts.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { routeHeads, clip, SITE_ORIGIN } from '../utils/routeMeta';
import { projectPath } from '../utils/slug';
import { PROJECTS, PERSONAL_INFO } from '../constants';
import {
  renderRouteHead,
  imageSize,
  usableAsCard,
  resolveCardImage,
  imageWorksAsCard,
  routeHeadsPlugin,
} from '../../scripts/routeHeads.js';
import { buildSitemap, projectTitles } from '../../scripts/buildSitemap.js';

const root = process.cwd();
const shell = readFileSync(resolve(root, 'index.html'), 'utf8');
const routes = routeHeads();

const inlineScripts = (html) =>
  [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).filter((b) => b.trim());
const sha = (s) => createHash('sha256').update(s, 'utf8').digest('base64');

describe('routeHeads()', () => {
  it('lists the résumé, the privacy notice and every project, once each', () => {
    const paths = routes.map((r) => r.path);
    expect(paths).toContain('/resume');
    expect(paths).toContain('/privacy');
    for (const p of PROJECTS) expect(paths).toContain(projectPath(p.title));
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths.every((p) => p.startsWith('/') && !p.endsWith('/'))).toBe(true);
  });

  it('gives every route a title with the name and a description that fits a result', () => {
    for (const r of routes) {
      expect(r.title, r.path).toContain(PERSONAL_INFO.name);
      expect(r.description.length, `${r.path} description`).toBeGreaterThan(20);
      expect(r.description.length, `${r.path} description too long`).toBeLessThanOrEqual(200);
    }
  });

  it('covers every URL the sitemap advertises', () => {
    // If the sitemap tells crawlers a page exists, that page must have its own head.
    const constants = readFileSync(resolve(root, 'src/constants.ts'), 'utf8');
    const xml = buildSitemap(projectTitles(constants), '2026-01-01');
    const advertised = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(SITE_ORIGIN, ''));
    const paths = new Set(routes.map((r) => r.path));
    for (const loc of advertised) {
      if (loc === '/') continue; // the shell itself
      expect(paths.has(loc), `${loc} is in the sitemap but has no head`).toBe(true);
    }
  });

  it('clip() cuts long text at a word, never mid-token', () => {
    expect(clip('short')).toBe('short');
    const long = Array.from({ length: 60 }, (_, i) => `word${i}`).join(' ');
    const out = clip(long, 100);
    expect(out.length).toBeLessThanOrEqual(100);
    expect(out.endsWith('…')).toBe(true);
    expect(out.slice(0, -1).split(' ').every((w) => long.split(' ').includes(w))).toBe(true);
  });
});

describe('renderRouteHead()', () => {
  const route = routes.find((r) => r.path === projectPath(PROJECTS[0].title));
  const out = renderRouteHead(shell, route, { origin: SITE_ORIGIN });

  it('swaps title, description, canonical and the social tags', () => {
    expect(out).toContain(`<title>${route.title.replace(/&/g, '&amp;')}</title>`);
    expect(out).toContain(`<link rel="canonical" href="${SITE_ORIGIN}${route.path}" />`);
    expect(out).toMatch(new RegExp(`<meta property="og:url" content="${SITE_ORIGIN}${route.path}" />`));
    expect(out).toMatch(/<meta property="og:type" content="article" \/>/);
    expect(out).toMatch(/<meta property="twitter:url" content="[^"]+\/projects\//);
    expect(out).not.toContain('Hasnain Raza | Portfolio');
  });

  it('leaves every inline script byte-identical, so the CSP hashes still hold', () => {
    const before = inlineScripts(shell).map(sha);
    const after = inlineScripts(out).map(sha);
    expect(after).toEqual(before);
    expect(after.length).toBeGreaterThan(0);
  });

  it('escapes attribute and text content', () => {
    const tricky = { path: '/x', title: 'A & B "quoted" <tag>', description: 'says "hi" & <bye>', type: 'website' };
    const html = renderRouteHead(shell, tricky, { origin: SITE_ORIGIN });
    expect(html).toContain('<title>A &amp; B "quoted" &lt;tag&gt;</title>');
    expect(html).toContain('content="A &amp; B &quot;quoted&quot; &lt;tag&gt;"');
    expect(html).toContain('content="says &quot;hi&quot; &amp; &lt;bye&gt;"');
    expect(html).not.toContain('<tag>');
  });

  it('keeps the site card when the route has no usable image', () => {
    expect(out).toContain('og-image.png');
    expect(out).toMatch(/<meta property="og:image:width" content="1200" \/>/);
  });

  it('uses the route image with its real size, or drops the size when unknown', () => {
    const withSize = renderRouteHead(shell, route, {
      origin: SITE_ORIGIN,
      image: { url: `${SITE_ORIGIN}/x.png`, alt: 'X', width: 1500, height: 800 },
    });
    expect(withSize).toMatch(/<meta property="og:image" content="[^"]+\/x\.png" \/>/);
    expect(withSize).toMatch(/<meta property="og:image:width" content="1500" \/>/);
    expect(withSize).toMatch(/<meta property="og:image:height" content="800" \/>/);
    expect(withSize).toMatch(/<meta property="twitter:image:alt" content="X" \/>/);

    const noSize = renderRouteHead(shell, route, { origin: SITE_ORIGIN, image: { url: 'https://h/y.png', alt: 'Y' } });
    expect(noSize).not.toContain('og:image:width');
    expect(noSize).not.toContain('og:image:height');
  });

  it('refuses a shell it cannot fill in rather than shipping a wrong head', () => {
    expect(() => renderRouteHead('<html><head></head></html>', route, { origin: SITE_ORIGIN })).toThrow(/title/);
  });
});

describe('social image selection', () => {
  it('reads PNG and JPEG sizes from the header', () => {
    expect(imageSize(readFileSync(resolve(root, 'public/peakroutine-hero.png')))).toEqual({ width: 1200, height: 630 });
    expect(imageSize(readFileSync(resolve(root, 'public/Xplane.jpg')))).toEqual({ width: 1600, height: 444 });
    expect(imageSize(Buffer.from('not an image at all, really not'))).toBeNull();
  });

  it('accepts landscape cards and rejects thumbnails and banners', () => {
    expect(usableAsCard({ width: 1200, height: 630 })).toBe(true);
    expect(usableAsCard({ width: 1600, height: 649 })).toBe(true);
    expect(usableAsCard({ width: 331, height: 383 })).toBe(false); // portrait thumbnail
    expect(usableAsCard({ width: 500, height: 291 })).toBe(false); // too small
    expect(usableAsCard({ width: 1600, height: 444 })).toBe(false); // 3.6:1 banner loses its sides
    expect(usableAsCard(null)).toBe(false);
  });

  it('prefers the generated card over the site card when artwork is unusable', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'route-heads-card-'));
    mkdirSync(join(outDir, 'og'));
    writeFileSync(join(outDir, 'og/p.jpg'), readFileSync(resolve(root, 'public/og/project-vimaan.jpg')));
    // Unusable artwork (absent here) + a generated card present -> the card.
    expect(
      resolveCardImage(outDir, SITE_ORIGIN, { path: '/p', title: 'P', image: '/nope.png', generatedCard: '/og/p.jpg' }),
    ).toEqual({ url: `${SITE_ORIGIN}/og/p.jpg`, alt: 'P', width: 1200, height: 630 });
  });

  it('still prefers real artwork over the generated card', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'route-heads-real-'));
    mkdirSync(join(outDir, 'og'));
    writeFileSync(join(outDir, 'real.png'), readFileSync(resolve(root, 'public/peakroutine-hero.png')));
    writeFileSync(join(outDir, 'og/p.jpg'), readFileSync(resolve(root, 'public/og/project-vimaan.jpg')));
    const got = resolveCardImage(outDir, SITE_ORIGIN, {
      path: '/p', title: 'P', image: '/real.png', generatedCard: '/og/p.jpg',
    });
    expect(got.url).toBe(`${SITE_ORIGIN}/real.png`);
  });

  it('imageWorksAsCard answers for a real file, a missing one, and nothing at all', () => {
    expect(imageWorksAsCard(resolve(root, 'public'), '/peakroutine-hero.png')).toBe(true);
    expect(imageWorksAsCard(resolve(root, 'public'), '/RVSAT.png')).toBe(false); // 331x383 portrait
    expect(imageWorksAsCard(resolve(root, 'public'), '/does-not-exist.png')).toBe(false);
    expect(imageWorksAsCard(resolve(root, 'public'), undefined)).toBe(false);
  });

  it('resolves against the build output, falling back when the file is missing', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'route-heads-'));
    expect(resolveCardImage(outDir, SITE_ORIGIN, { path: '/p', image: '/missing.png' })).toBeUndefined();
    writeFileSync(join(outDir, 'card.png'), readFileSync(resolve(root, 'public/peakroutine-hero.png')));
    expect(resolveCardImage(outDir, SITE_ORIGIN, { path: '/p', title: 'P', image: '/card.png', imageAlt: 'P shot' })).toEqual({
      url: `${SITE_ORIGIN}/card.png`,
      alt: 'P shot',
      width: 1200,
      height: 630,
    });
  });
});

describe('routeHeadsPlugin', () => {
  it('writes dist/<route>.html for every route, from the built shell', () => {
    const root = mkdtempSync(join(tmpdir(), 'route-heads-build-'));
    mkdirSync(join(root, 'dist'));
    writeFileSync(join(root, 'dist/index.html'), shell);

    const plugin = routeHeadsPlugin({ routes, origin: SITE_ORIGIN });
    expect(plugin.apply).toBe('build');
    plugin.configResolved({ root, build: { outDir: 'dist' } });
    plugin.closeBundle();

    expect(existsSync(join(root, 'dist/resume.html'))).toBe(true);
    expect(existsSync(join(root, 'dist/privacy.html'))).toBe(true);
    for (const p of PROJECTS) {
      const file = join(root, `dist${projectPath(p.title)}.html`);
      expect(existsSync(file), file).toBe(true);
      expect(readFileSync(file, 'utf8')).toContain(`<title>${p.title.replace(/&/g, '&amp;')} | ${PERSONAL_INFO.name}</title>`);
    }
    // The shell itself is untouched.
    expect(readFileSync(join(root, 'dist/index.html'), 'utf8')).toBe(shell);
  });

  it('is registered in vite.config.js', () => {
    expect(readFileSync(resolve(root, 'vite.config.js'), 'utf8')).toContain('routeHeadsPlugin(');
  });
});

describe('vercel.json serves the per-route files', () => {
  const config = JSON.parse(readFileSync(resolve(root, 'vercel.json'), 'utf8'));

  it('maps /projects/<slug> to projects/<slug>.html with cleanUrls', () => {
    // Without this the flat files are only reachable at their .html URLs and
    // the extensionless route — the one people share — is a 404.
    expect(config.cleanUrls).toBe(true);
  });

  it('normalises trailing slashes so each page has one URL', () => {
    expect(config.trailingSlash).toBe(false);
  });
});
