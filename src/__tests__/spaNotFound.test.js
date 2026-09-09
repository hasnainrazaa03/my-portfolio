/**
 * spaNotFound.test.js — the build must emit a 404.html the host will serve.
 *
 * Every real route is a file in the build (spaRouting.test.js); anything
 * else misses. That only becomes a real not-found page — instead of
 * Vercel's bare default — if dist/404.html exists, and it only stays in step
 * with the app if it IS the app: a copy of the built index.html, hashed asset
 * names and CSP-pinned inline scripts included.
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spaNotFoundPage } from '../../scripts/spaNotFound.js';

/** A throwaway "dist" with (or without) an index.html in it. */
function fakeBuild(html) {
  const root = mkdtempSync(join(tmpdir(), 'spa-not-found-'));
  mkdirSync(join(root, 'out'));
  if (html !== null) writeFileSync(join(root, 'out/index.html'), html);
  return root;
}

describe('spaNotFoundPage plugin', () => {
  it('runs only for builds, after the bundle is written', () => {
    const plugin = spaNotFoundPage();
    expect(plugin.apply).toBe('build');
    expect(typeof plugin.closeBundle).toBe('function');
  });

  it('copies the built index.html to 404.html, byte for byte', () => {
    const html = '<!doctype html><script type="module" src="/assets/index-Ab12Cd34.js"></script>';
    const root = fakeBuild(html);
    const plugin = spaNotFoundPage();
    plugin.configResolved({ root, build: { outDir: 'out' } });
    plugin.closeBundle();
    expect(readFileSync(join(root, 'out/404.html'), 'utf8')).toBe(html);
  });

  it('does nothing when there is no index.html to copy', () => {
    const root = fakeBuild(null);
    const plugin = spaNotFoundPage();
    plugin.configResolved({ root, build: { outDir: 'out' } });
    expect(() => plugin.closeBundle()).not.toThrow();
    expect(existsSync(join(root, 'out/404.html'))).toBe(false);
  });

  it('is registered in vite.config.js', () => {
    const config = readFileSync(resolve(process.cwd(), 'vite.config.js'), 'utf8');
    expect(config).toContain('spaNotFoundPage()');
  });
});
