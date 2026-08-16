/**
 * highContrast.test.js — the high-contrast variant must be theme-aware.
 *
 * THE BUG THIS PREVENTS: the `hc` rules assumed a black page and forced every
 * muted slate tone to near-white (#f8fafc). Blackening `body` doesn't blacken
 * anything else — the decorative starfield canvas paints over it and cards
 * carry their own `bg-white` — so in LIGHT mode high contrast produced
 * near-white text on white surfaces, site-wide. Turning on the accessibility
 * aid made the page strictly less readable, which is the opposite of the point.
 * Reported by the user; reproduced and fixed 2026-08-16.
 *
 * These assert the structural property (rules are split on `.dark`) rather than
 * exact colours, so restyling stays free while the split stays enforced.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

/** Selector heads of every rule mentioning `html.hc`. */
function hcSelectors() {
  return [...css.matchAll(/([^{}]*html\.hc[^{}]*)\{([^}]*)\}/g)].map((m) => ({
    selector: m[1].trim().replace(/\s+/g, ' '),
    body: m[2].trim(),
  }));
}

describe('high-contrast variant', () => {
  const rules = hcSelectors();

  it('defines rules for both themes', () => {
    expect(rules.some((r) => r.selector.includes('html.hc.dark'))).toBe(true);
    expect(rules.some((r) => r.selector.includes('html.hc:not(.dark)'))).toBe(true);
  });

  it('never sets a page background or text colour unscoped by theme', () => {
    // An unscoped `html.hc body { background: … }` is what made light mode
    // unreadable: it blackened the page for BOTH themes.
    const unscoped = rules.filter(
      (r) =>
        !r.selector.includes('.dark') &&
        /\bbody\b/.test(r.selector) &&
        /(^|;|\s)(background|color)\s*:/.test(r.body),
    );
    expect(unscoped.map((r) => r.selector)).toEqual([]);
  });

  it('forces near-white text only in the dark theme', () => {
    const nearWhite = rules.filter((r) => /#f8fafc|#fff\b|#ffffff/i.test(r.body) && /color\s*:/.test(r.body));
    for (const rule of nearWhite) {
      expect(
        rule.selector.includes('.dark') || rule.selector.includes('skip-to-content'),
        `"${rule.selector}" forces near-white text without scoping to the dark theme`,
      ).toBe(true);
    }
  });

  it('hides the decorative starfield, which defeats a flat high-contrast ground', () => {
    const hidesCanvas = rules.some(
      (r) => r.selector.includes('.space-bg') && /display\s*:\s*none/.test(r.body),
    );
    expect(hidesCanvas).toBe(true);
  });

  it('gives the skip link its own colour pair', () => {
    // It is an <a> on a coloured ground, so the anchor-colour override would
    // otherwise tint it teal-on-teal (measured 1.26:1).
    const skip = rules.find((r) => r.selector.includes('skip-to-content'));
    expect(skip, 'no high-contrast rule for .skip-to-content').toBeDefined();
    expect(skip.body).toMatch(/background/);
    expect(skip.body).toMatch(/color/);
  });

  it('places the skip-link rule last so it wins on source order', () => {
    // `html.hc.dark a` is (0,2,2); `html.hc a.skip-to-content` matches that, so
    // it only wins by coming later in the file.
    const anchorRule = css.lastIndexOf('html.hc.dark a,');
    const skipRule = css.lastIndexOf('html.hc a.skip-to-content');
    expect(skipRule).toBeGreaterThan(anchorRule);
  });
});
