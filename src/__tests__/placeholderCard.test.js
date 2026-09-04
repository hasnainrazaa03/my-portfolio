/**
 * placeholderCard.test.js — generated project artwork.
 *
 * Project thumbnails render at 400x160 with `object-cover`. A square logo used
 * as a thumbnail gets cropped to a 2.5:1 strip with its lettering sliced, which
 * reads as a broken image rather than a deliberate placeholder — that is what
 * shipped when PeakRoutine was added, and why this generator exists.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderCard, wrapTitle } from '../../scripts/makePlaceholderCard.js';

describe('wrapTitle', () => {
  it('keeps a short title on one line', () => {
    expect(wrapTitle('PeakRoutine')).toEqual(['PeakRoutine']);
  });

  it('breaks a long title rather than overflowing the card', () => {
    const lines = wrapTitle('Numerical Investigation of Store Separation from a Cavity');
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(30);
  });

  it('never returns more than three lines', () => {
    expect(wrapTitle('one two three four five six seven eight nine ten eleven twelve').length)
      .toBeLessThanOrEqual(3);
  });

  it('handles an empty title', () => {
    expect(wrapTitle('')).toEqual([]);
  });
});

describe('renderCard', () => {
  it('renders at the aspect ratio the card crops to', () => {
    const svg = renderCard({ title: 'X' });
    // 1200x480 is 2.5:1, matching the 400x160 thumbnail box, so `object-cover`
    // crops nothing.
    expect(svg).toContain('viewBox="0 0 1200 480"');
  });

  it('escapes XML metacharacters in the title', () => {
    // "AI Health & Wellness Platform" — a bare & makes the SVG unparseable.
    const svg = renderCard({ title: 'Health & Safety', subtitle: '<b>x</b>' });
    expect(svg).toContain('Health &amp; Safety');
    expect(svg).not.toMatch(/[^;]&[a-z]* /);
    expect(svg).toContain('&lt;b&gt;');
  });

  it('includes an accessible name', () => {
    const svg = renderCard({ title: 'PeakRoutine' });
    expect(svg).toContain('role="img"');
    expect(svg).toContain('aria-label="PeakRoutine"');
  });

  it('omits the subtitle line when there is none', () => {
    expect(renderCard({ title: 'X' }).match(/<text/g)).toHaveLength(1);
  });
});

describe('the committed card', () => {
  it('is valid, self-contained SVG', () => {
    const svg = readFileSync(resolve(process.cwd(), 'public/peakroutine-card.svg'), 'utf8');
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('PeakRoutine');
    // No external RESOURCE references: img-src is 'self', so a remote image,
    // font or stylesheet would silently fail to paint. The xmlns URI is a
    // namespace identifier, not a fetch, so it does not count.
    expect(svg).not.toMatch(/(?:href|src)\s*=\s*["']https?:/i);
    expect(svg).not.toMatch(/url\(\s*["']?https?:/i);
    expect(svg).not.toContain('<image');
  });
});
