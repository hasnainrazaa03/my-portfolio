/**
 * checkBundleSize.test.js — the initial-payload budget.
 *
 * The regression this exists for: a `manualChunks` entry for
 * react-github-calendar produced a chunk that also absorbed Vite's shared
 * `__vitePreload` helper. Every lazy chunk imports that helper, so the chunk
 * became eager and dragged 23.8 KB gz of a below-the-fold contribution calendar
 * onto the critical path — silently undoing `lazy()` on GitHubSection. Total
 * dist size barely moved, which is why the budget measures the initial payload.
 */
import { describe, it, expect } from 'vitest';
import { parseEagerAssets, stripHash, evaluate } from '../../scripts/checkBundleSize.js';

describe('parseEagerAssets', () => {
  const html = `<!doctype html><html><head>
    <script type="module" crossorigin src="/assets/index-CxSCiRDP.js"></script>
    <link rel="modulepreload" crossorigin href="/assets/react-1F4Zo2jI.js">
    <link rel="modulepreload" crossorigin href="/assets/motion-DXF2BkS6.js">
    <link rel="stylesheet" crossorigin href="/assets/index-D3G-sMgf.css">
  </head><body></body></html>`;

  it('collects the entry, its modulepreloads, and the stylesheet', () => {
    expect(parseEagerAssets(html)).toEqual([
      'index-CxSCiRDP.js',
      'index-D3G-sMgf.css',
      'motion-DXF2BkS6.js',
      'react-1F4Zo2jI.js',
    ]);
  });

  it('ignores chunks that are only reachable via dynamic import', () => {
    // Lazy chunks never appear in index.html — that is the whole point.
    expect(parseEagerAssets(html)).not.toContain('GitHubSection-Dw5_7Vh3.js');
  });

  it('deduplicates an asset referenced twice', () => {
    const dup = '<script src="/assets/a-1234abcd.js"></script><link href="/assets/a-1234abcd.js">';
    expect(parseEagerAssets(dup)).toEqual(['a-1234abcd.js']);
  });

  it('returns nothing for a document with no asset references', () => {
    expect(parseEagerAssets('<html><body>hi</body></html>')).toEqual([]);
  });
});

describe('stripHash', () => {
  it('removes the Vite content hash so budgets survive a rebuild', () => {
    expect(stripHash('index-CxSCiRDP.js')).toBe('index.js');
    expect(stripHash('index-D3G-sMgf.css')).toBe('index.css');
  });

  it('leaves an unhashed name alone', () => {
    expect(stripHash('index.js')).toBe('index.js');
  });

  it('keeps hyphenated chunk names intact', () => {
    expect(stripHash('chevron-right-BdWg8mub.js')).toBe('chevron-right.js');
  });

  it('handles a hash that itself contains a hyphen', () => {
    // Vite hashes are base64url, so `-` appears INSIDE them. This one is real
    // (dist/assets/index-D3G-sMgf.css) and rules out splitting on the last
    // hyphen; only a fixed 8-char width reads both this and the case above.
    expect(stripHash('index-D3G-sMgf.css')).toBe('index.css');
  });
});

describe('evaluate', () => {
  const budget = { totalInitialGzip: 175_104, assets: { 'index.js': 47_104, 'react.js': 66_560 } };

  it('passes when every asset and the total are under budget', () => {
    const r = evaluate([{ name: 'index-abc12345.js', gzip: 42_000 }, { name: 'react-def67890.js', gzip: 60_000 }], budget);
    expect(r.rows.every((x) => !x.over)).toBe(true);
    expect(r.totalOver).toBe(false);
    expect(r.unbudgeted).toEqual([]);
  });

  it('flags a single asset that outgrew its budget', () => {
    const r = evaluate([{ name: 'index-abc12345.js', gzip: 50_000 }], budget);
    expect(r.rows[0].over).toBe(true);
  });

  it('flags the total even when each asset is individually fine', () => {
    const r = evaluate(
      [{ name: 'index-abc12345.js', gzip: 47_000 }, { name: 'react-def67890.js', gzip: 66_000 }, { name: 'motion-a1b2c3d4.js', gzip: 63_000 }],
      { ...budget, assets: { ...budget.assets, 'motion.js': 64_000 } },
    );
    expect(r.rows.every((x) => !x.over)).toBe(true);
    expect(r.totalOver).toBe(true);
  });

  it('reports a newly eager asset — the real signal that lazy() broke', () => {
    const r = evaluate(
      [{ name: 'index-abc12345.js', gzip: 42_000 }, { name: 'github-jzgR8xRk.js', gzip: 24_400 }],
      budget,
    );
    expect(r.unbudgeted).toEqual(['github.js']);
  });

  it('sums the total from gzip sizes', () => {
    const r = evaluate([{ name: 'a-abc12345.js', gzip: 10 }, { name: 'b-def67890.js', gzip: 32 }], budget);
    expect(r.total).toBe(42);
  });
});
