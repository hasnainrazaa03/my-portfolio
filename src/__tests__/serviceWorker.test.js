/**
 * serviceWorker.test.js — offline support, and the ways it goes wrong.
 *
 * A service worker that serves stale code is the worst failure this codebase
 * can ship, because the fix is also cached: the visitor has to know to clear
 * site data, and they never will. So most of this file is about the update
 * path rather than about caching working at all.
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { precacheList, renderWorker, serviceWorkerPlugin } from '../../scripts/serviceWorker.js';
import { routeHeads } from '../utils/routeMeta';

const root = process.cwd();
const manifest = JSON.parse(readFileSync(resolve(root, 'public/manifest.webmanifest'), 'utf8'));

/**
 * A throwaway build: one eager entry referenced by index.html, one lazy chunk
 * that is NOT, plus a font and some route HTML.
 */
function fakeBuild() {
  const dir = mkdtempSync(join(tmpdir(), 'sw-'));
  mkdirSync(join(dir, 'assets'));
  mkdirSync(join(dir, 'fonts'));
  mkdirSync(join(dir, 'projects'));
  writeFileSync(
    join(dir, 'index.html'),
    '<!doctype html><link rel="stylesheet" href="/assets/index-AAAAAAAA.css">' +
      '<script type="module" src="/assets/index-BBBBBBBB.js"></script>' +
      '<link rel="modulepreload" href="/assets/react-CCCCCCCC.js">',
  );
  writeFileSync(join(dir, 'resume.html'), '<!doctype html>');
  writeFileSync(join(dir, '404.html'), '<!doctype html>');
  writeFileSync(join(dir, 'projects/a.html'), '<!doctype html>');
  writeFileSync(join(dir, 'assets/index-AAAAAAAA.css'), 'body{}');
  writeFileSync(join(dir, 'assets/index-BBBBBBBB.js'), 'entry');
  writeFileSync(join(dir, 'assets/react-CCCCCCCC.js'), 'react');
  // Emitted by Vite but NOT referenced by index.html — a lazy chunk.
  writeFileSync(join(dir, 'assets/index-DDDDDDDD.js'), 'x'.repeat(500_000));
  writeFileSync(join(dir, 'assets/Chatbot-EEEEEEEE.js'), 'chat');
  writeFileSync(join(dir, 'fonts/inter.woff2'), 'font');
  return dir;
}

describe('what gets precached', () => {
  const dir = fakeBuild();
  const list = precacheList(dir);

  it('takes every route HTML, so a shared link opens offline', () => {
    expect(list).toContain('/index.html');
    expect(list).toContain('/resume.html');
    expect(list).toContain('/projects/a.html');
    expect(list).toContain('/404.html');
  });

  it('takes the assets index.html actually references', () => {
    expect(list).toContain('/assets/index-BBBBBBBB.js');
    expect(list).toContain('/assets/index-AAAAAAAA.css');
    expect(list).toContain('/assets/react-CCCCCCCC.js');
    expect(list).toContain('/fonts/inter.woff2');
  });

  it('does NOT take lazy chunks, however they are named', () => {
    // The first version matched names with a regex and precached a 482 KB
    // lazy chunk, because Vite emits more than one file starting `index-` and
    // only one of them is the entry.
    expect(list).not.toContain('/assets/index-DDDDDDDD.js');
    expect(list).not.toContain('/assets/Chatbot-EEEEEEEE.js');
  });

  it('stays close to the initial payload in size', () => {
    const bytes = list.reduce((n, f) => n + readFileSync(join(dir, `.${f}`)).length, 0);
    expect(bytes).toBeLessThan(200_000); // the 500 KB lazy chunk is excluded
  });
});

describe('the generated worker', () => {
  const sw = renderWorker(['/index.html', '/assets/index-BBBBBBBB.js'], 'abc123');
  /**
   * Comments stripped. The worker explains in prose why it does NOT call
   * skipWaiting or addAll, so a plain substring search finds those words in
   * the explanation and reports the opposite of the truth — which is exactly
   * what the first version of these two assertions did.
   */
  const code = sw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('never claims control from a running page', () => {
    // A page loaded with the old HTML is still requesting the old chunk names.
    // Taking over and dropping the old cache breaks it mid-session.
    expect(code).not.toMatch(/\bskipWaiting\s*\(/);
    expect(code).not.toMatch(/clients\.claim\s*\(/);
  });

  it('serves navigations network-first', () => {
    // HTML names the asset hashes, so a cached HTML pins a visitor to a build
    // forever — including past the deploy that would have fixed it.
    expect(sw).toMatch(/request\.mode === 'navigate'[\s\S]{0,80}networkFirst/);
  });

  it('serves hashed assets cache-first, which is what the hash is for', () => {
    expect(sw).toMatch(/\/assets\/[\s\S]{0,120}cacheFirst/);
  });

  it('never caches the API', () => {
    // Answers depend on the request and on rate-limit state; a cached one is
    // wrong in a way nobody can see.
    expect(sw).toMatch(/pathname\.startsWith\('\/api\/'\)[\s\S]{0,20}return/);
  });

  it('ignores non-GET and cross-origin requests', () => {
    expect(sw).toMatch(/request\.method !== 'GET'[\s\S]{0,20}return/);
    expect(sw).toMatch(/url\.origin !== self\.location\.origin[\s\S]{0,20}return/);
  });

  it('deletes only its own old caches', () => {
    expect(sw).toMatch(/keys\.filter\(\(k\) => k\.startsWith\('hr-'\) && k !== CACHE\)/);
  });

  it('survives one missing asset instead of failing the whole install', () => {
    // cache.addAll is atomic: a single 404 leaves the visitor with no worker,
    // and no error anyone will ever see.
    expect(code).not.toMatch(/\.addAll\s*\(/);
    expect(code).toMatch(/cache\.add\(url\)\.catch/);
  });

  it('stamps a version so a new build gets a new cache', () => {
    expect(sw).toContain('const VERSION = "abc123"');
    expect(sw).toContain("const CACHE = 'hr-' + VERSION");
  });
});

describe('the plugin', () => {
  it('writes dist/sw.js, and only for builds', () => {
    const dir = fakeBuild();
    const plugin = serviceWorkerPlugin();
    expect(plugin.apply).toBe('build');
    plugin.configResolved({ root: dir, build: { outDir: '.' } });
    plugin.closeBundle();
    expect(existsSync(join(dir, 'sw.js'))).toBe(true);
    expect(readFileSync(join(dir, 'sw.js'), 'utf8')).toContain('const PRECACHE');
  });

  it('gives identical output an identical version, and changed output a new one', () => {
    // Otherwise every deploy invalidates every visitor's cache for nothing.
    const version = (dir) => {
      const plugin = serviceWorkerPlugin();
      plugin.configResolved({ root: dir, build: { outDir: '.' } });
      plugin.closeBundle();
      return /const VERSION = "([^"]+)"/.exec(readFileSync(join(dir, 'sw.js'), 'utf8'))[1];
    };
    const a = fakeBuild();
    const b = fakeBuild();
    expect(version(a)).toBe(version(b));

    writeFileSync(join(b, 'assets/index-BBBBBBBB.js'), 'entry, but different');
    expect(version(b)).not.toBe(version(a));
  });

  it('does nothing without an index.html to read', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sw-empty-'));
    const plugin = serviceWorkerPlugin();
    plugin.configResolved({ root: dir, build: { outDir: '.' } });
    expect(() => plugin.closeBundle()).not.toThrow();
    expect(existsSync(join(dir, 'sw.js'))).toBe(false);
  });

  it('is registered LAST in vite.config.js', () => {
    // It scans dist/, so every other generator must have written its files.
    const config = readFileSync(resolve(root, 'vite.config.js'), 'utf8');
    expect(config).toContain('serviceWorkerPlugin()');
    expect(config.indexOf('serviceWorkerPlugin()')).toBeGreaterThan(config.indexOf('routeHeadsPlugin('));
    expect(config.indexOf('serviceWorkerPlugin()')).toBeGreaterThan(config.indexOf('spaNotFoundPage('));
  });
});

describe('registration', () => {
  const src = readFileSync(resolve(root, 'src/registerServiceWorker.ts'), 'utf8');

  it('is production-only', () => {
    // In dev, Vite serves modules unbundled; a worker caching them would serve
    // yesterday's code back to the person editing it.
    expect(src).toMatch(/import\.meta\.env\.PROD/);
  });

  it('waits for load, so the precache does not compete with first paint', () => {
    expect(src).toMatch(/addEventListener\('load'/);
  });

  it('never throws — offline support is an enhancement', () => {
    expect(src).toMatch(/\.catch\(/);
  });

  it('is actually called from the entry point', () => {
    const main = readFileSync(resolve(root, 'src/main.tsx'), 'utf8');
    expect(main).toMatch(/registerServiceWorker\(\)/);
  });
});

describe('the web app manifest', () => {
  it('declares what an install prompt requires', () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name.length).toBeLessThanOrEqual(12); // launcher truncates
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.background_color).toBe('#030014');
  });

  it('ships a 192, a 512 and a maskable icon, and all of them exist', () => {
    const sizes = manifest.icons.map((i) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
    for (const icon of manifest.icons) {
      expect(existsSync(resolve(root, `public${icon.src}`)), icon.src).toBe(true);
    }
  });

  it('is linked from index.html, with the Apple icon Safari needs separately', () => {
    const html = readFileSync(resolve(root, 'index.html'), 'utf8');
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />');
    expect(html).toMatch(/rel="apple-touch-icon"/);
    expect(existsSync(resolve(root, 'public/app-icons/apple-touch-icon.png'))).toBe(true);
  });

  it('only shortcuts to routes that exist', () => {
    // A launcher shortcut to a 404 is worse than no shortcut.
    const routes = new Set(['/', ...routeHeads().map((r) => r.path)]);
    for (const s of manifest.shortcuts ?? []) {
      expect(routes.has(s.url), `${s.url} is not a route`).toBe(true);
    }
  });

  it('keeps the app icons out of the tech-icon directory', () => {
    // public/icons/ is the self-hosted devicon set for the skills grid.
    for (const icon of manifest.icons) expect(icon.src.startsWith('/app-icons/')).toBe(true);
  });
});

describe('cache headers', () => {
  const vercel = JSON.parse(readFileSync(resolve(root, 'vercel.json'), 'utf8'));
  const rule = (prefix) => vercel.headers.find((h) => h.source.startsWith(prefix));

  it('makes sw.js revalidate every time', () => {
    // The worker is the one file that must never be served stale: a cached
    // worker cannot be replaced by the deploy that fixes it.
    const value = rule('/sw.js').headers.find((h) => h.key === 'Cache-Control').value;
    expect(value).toMatch(/max-age=0/);
    expect(value).toMatch(/must-revalidate/);
    expect(value).not.toMatch(/immutable/);
  });
});
