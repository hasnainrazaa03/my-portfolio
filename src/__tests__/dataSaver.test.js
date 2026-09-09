/**
 * dataSaver.test.js — honour Data Saver and slow links for decoration.
 *
 * The hero's 3D core is a 127 KB chunk of pure decoration with a CSS stand-in
 * already built for the no-WebGL case. A visitor who has turned on their
 * browser's Data Saver, or is on a 2g/3g estimate, gets the stand-in instead
 * of the download.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { prefersReducedData } from '../hooks/useDataSaver';

describe('prefersReducedData', () => {
  it('is false without the Network Information API', () => {
    expect(prefersReducedData({})).toBe(false);
    expect(prefersReducedData({ connection: undefined })).toBe(false);
  });

  it('is true when the visitor asked for less data', () => {
    expect(prefersReducedData({ connection: { saveData: true, effectiveType: '4g' } })).toBe(true);
  });

  it('is true on a slow link estimate, false on a fast one', () => {
    for (const t of ['slow-2g', '2g', '3g']) {
      expect(prefersReducedData({ connection: { effectiveType: t } }), t).toBe(true);
    }
    expect(prefersReducedData({ connection: { effectiveType: '4g' } })).toBe(false);
    expect(prefersReducedData({ connection: { saveData: false } })).toBe(false);
  });
});

describe('Hero', () => {
  it('gates the 3D mount on data saver, not only on the breakpoint', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/components/Hero.tsx'), 'utf8');
    expect(src).toMatch(/useDataSaver\(\)/);
    expect(src).toMatch(/showHero3D = useMediaQuery\(MD_BREAKPOINT\) && !dataSaver/);
  });
});
