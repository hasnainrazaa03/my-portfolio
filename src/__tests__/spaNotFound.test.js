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
import { spaNotFoundPage, NOT_FOUND_HEAD } from '../../scripts/spaNotFound.js';

const shell = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

/** Run the plugin over a throwaway build. */
function build(root) {
  const plugin = spaNotFoundPage({ origin: 'https://hasnainrazaa.vercel.app' });
  plugin.configResolved({ root, build: { outDir: 'out' } });
  plugin.closeBundle();
}

/** A throwaway "dist" with (or without) an index.html in it. */
function fakeBuild(html) {
  const root = mkdtempSync(join(tmpdir(), 'spa-not-found-'));
  mkdirSync(join(root, 'out'));
  if (html !== null) writeFileSync(join(root, 'out/index.html'), html);
  return root;
}

describe('spaNotFoundPage plugin', () => {
  it('runs only for builds, after the bundle is written', () => {
    const plugin = spaNotFoundPage({ origin: 'https://example.test' });
    expect(plugin.apply).toBe('build');
    expect(typeof plugin.closeBundle).toBe('function');
  });

  it('keeps the app shell — same scripts, so it boots and the CSP hashes hold', () => {
    const root = fakeBuild(shell);
    build(root);
    const out = readFileSync(join(root, 'out/404.html'), 'utf8');
    const scripts = (s) => [...s.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    expect(scripts(out)).toEqual(scripts(shell));
    expect(out).toContain('src="/src/main.tsx"');
  });

  it('does NOT inherit the home page head — that was the soft 404 all over again', () => {
    const root = fakeBuild(shell);
    build(root);
    const out = readFileSync(join(root, 'out/404.html'), 'utf8');
    // A straight copy made every dead URL declare <link rel=canonical href="/">
    // — i.e. "this 404 is the home page" — and preview as the portfolio.
    // NotFoundPage sets noindex at runtime, but scrapers do not run scripts.
    expect(out).not.toContain('rel="canonical"');
    expect(out).toContain('<meta name="robots" content="noindex" />');
    expect(out).toMatch(/<title>Page not found \| Hasnain Raza<\/title>/);
    expect(out).not.toContain('<title>Hasnain Raza | Portfolio</title>');
  });

  it('does nothing when there is no index.html to copy', () => {
    const root = fakeBuild(null);
    expect(() => build(root)).not.toThrow();
    expect(existsSync(join(root, 'out/404.html'))).toBe(false);
  });

  it('is registered in vite.config.js, with an origin', () => {
    const config = readFileSync(resolve(process.cwd(), 'vite.config.js'), 'utf8');
    expect(config).toMatch(/spaNotFoundPage\(\{\s*origin:/);
  });

  it('claims no URL of its own', () => {
    // `path: null` is what drops the canonical; a real path here would make
    // every 404 a declared duplicate of that page.
    expect(NOT_FOUND_HEAD.path).toBeNull();
  });
});
