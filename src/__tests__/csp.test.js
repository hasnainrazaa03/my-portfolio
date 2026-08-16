/**
 * csp.test.js — keeps the enforced Content-Security-Policy honest.
 *
 * WHY THIS TEST EXISTS: `script-src` no longer allows 'unsafe-inline'. The one
 * inline script on the page is the JSON-LD structured-data block, which is
 * allowed by a pinned sha256 hash in vercel.json.
 *
 * A hash pinned in a config file rots silently: edit the structured data, ship
 * it, and the browser blocks the block — Google stops seeing your Person
 * schema, with no error anywhere in the app. This recomputes the hash from
 * index.html and fails the build if vercel.json has drifted.
 *
 * Note `<script type="application/ld+json">` IS governed by script-src even
 * though it executes nothing — which is exactly why the hash is required.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const root = process.cwd();
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const vercel = JSON.parse(readFileSync(resolve(root, 'vercel.json'), 'utf8'));

const cspHeader = vercel.headers
  .flatMap((rule) => rule.headers)
  .find((h) => h.key.toLowerCase().startsWith('content-security-policy'));

const directives = Object.fromEntries(
  cspHeader.value
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [name, ...values] = part.split(/\s+/);
      return [name, values];
    }),
);

/** Inline (non-empty, non-src) script bodies, in document order. */
function inlineScripts(source) {
  return [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => m[1])
    .filter((body) => body.trim().length > 0);
}

const sha256 = (body) => `sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}`;

describe('Content-Security-Policy', () => {
  it('is enforcing, not Report-Only', () => {
    expect(cspHeader.key).toBe('Content-Security-Policy');
  });

  it('does not allow unsafe-inline scripts', () => {
    expect(directives['script-src']).not.toContain("'unsafe-inline'");
  });

  it('does not allow unsafe-eval', () => {
    expect(directives['script-src']).not.toContain("'unsafe-eval'");
  });

  it('allows every inline script in index.html by hash', () => {
    const scripts = inlineScripts(html);
    expect(scripts.length).toBeGreaterThan(0); // the JSON-LD block

    for (const body of scripts) {
      expect(
        directives['script-src'],
        `No sha256 in vercel.json matches an inline <script> in index.html.\n` +
          `Add this to script-src:\n  '${sha256(body)}'\n` +
          `(the block starts: ${JSON.stringify(body.trim().slice(0, 60))})`,
      ).toContain(`'${sha256(body)}'`);
    }
  });

  it('pins the hardening directives', () => {
    expect(directives['object-src']).toEqual(["'none'"]);
    expect(directives['frame-ancestors']).toEqual(["'none'"]);
    expect(directives['base-uri']).toEqual(["'self'"]);
    expect(directives['form-action']).toEqual(["'self'"]);
    expect(directives['default-src']).toEqual(["'self'"]);
  });

  it('keeps reporting enabled so violations stay visible', () => {
    expect(directives['report-uri']).toEqual(['/api/csp-report']);
  });
});
