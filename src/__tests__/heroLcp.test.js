/**
 * heroLcp.test.js — the hero's LCP element must be painted on the first frame.
 *
 * The <h1> is the page's Largest Contentful Paint element. An entrance that
 * starts at opacity 0 means it does not count as painted until the fade has
 * run: measured at ~600 ms after first paint on a real device, and a 4.0 s LCP
 * under mobile throttling for a page that had every byte by 0.5 s.
 *
 * The container may move; it must not start invisible.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'src/components/Hero.tsx'), 'utf8');

describe('hero text container', () => {
  const container = src.slice(src.indexOf('className="space-y-6 relative z-20"') - 220,
                              src.indexOf('className="space-y-6 relative z-20"'));

  it('uses the hero-specific entrance, not the shared fade', () => {
    expect(container).toMatch(/variants=\{heroEntrance\}/);
    expect(container).not.toMatch(/fadeInUp/);
  });

  it('does not start the LCP element at opacity 0', () => {
    const def = src.slice(src.indexOf('const heroEntrance'), src.indexOf('};', src.indexOf('const heroEntrance')));
    const hidden = def.slice(def.indexOf('hidden:'), def.indexOf('visible:'));
    expect(hidden, `hidden state animates opacity: ${hidden.trim()}`).not.toMatch(/opacity/);
  });

  it('does not import the shared fade at all — nothing above the fold should', () => {
    expect(src).not.toMatch(/import\s*\{[^}]*fadeInUp[^}]*\}\s*from\s*'\.\.\/animations'/);
  });
});
