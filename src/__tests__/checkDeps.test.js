/**
 * checkDeps.test.js — the production-reachability dependency gate.
 *
 * The gate blocks only on advisories reachable from production dependencies.
 * A blanket block would fail on day one over six dev-only transitives pinned by
 * @vercel/node, lighthouse and eslint — unfixable from this repo, and a red X
 * nobody can act on is one everybody learns to ignore.
 *
 * So the dev/prod split IS the gate. These tests pin it.
 */
import { describe, it, expect } from 'vitest';
import { lockfileQueries, collectHits } from '../../scripts/checkDeps.js';

const lock = (packages) => ({ packages });

describe('lockfileQueries', () => {
  it('emits one query per package with its version', () => {
    const { queries } = lockfileQueries(
      lock({ '': { name: 'root' }, 'node_modules/react': { version: '19.2.0' } }),
    );
    expect(queries).toEqual([{ package: { name: 'react', ecosystem: 'npm' }, version: '19.2.0' }]);
  });

  it('skips the root entry, which has no version to query', () => {
    const { queries } = lockfileQueries(lock({ '': { version: '1.3.0' } }));
    expect(queries).toEqual([]);
  });

  it('deduplicates the same package@version installed at several paths', () => {
    const { queries } = lockfileQueries(
      lock({
        'node_modules/ws': { version: '8.21.3' },
        'node_modules/jsdom/node_modules/ws': { version: '8.21.3' },
      }),
    );
    expect(queries).toHaveLength(1);
  });

  it('keeps distinct versions of the same package as separate queries', () => {
    const { queries } = lockfileQueries(
      lock({
        'node_modules/minimatch': { version: '10.1.1' },
        'node_modules/glob/node_modules/minimatch': { version: '3.1.2' },
      }),
    );
    expect(queries.map((q) => q.version).sort()).toEqual(['10.1.1', '3.1.2']);
  });

  it('marks a package dev-only when every install path is dev', () => {
    const { devOnly } = lockfileQueries(lock({ 'node_modules/vite': { version: '7.3.6', dev: true } }));
    expect(devOnly.vite).toBe(true);
  });

  it('marks a package production-reachable if ANY path is non-dev', () => {
    // ws arrives via @supabase/supabase-js (prod) AND jsdom (dev). Prod wins —
    // this exact case is why the check is an AND across paths, not a first-wins.
    const { devOnly } = lockfileQueries(
      lock({
        'node_modules/jsdom/node_modules/ws': { version: '8.21.3', dev: true },
        'node_modules/ws': { version: '8.21.3' },
      }),
    );
    expect(devOnly.ws).toBe(false);
  });

  it('ignores entries outside node_modules, such as workspace links', () => {
    const { queries } = lockfileQueries(lock({ 'packages/site': { version: '1.0.0' } }));
    expect(queries).toEqual([]);
  });
});

describe('collectHits', () => {
  const queries = [
    { package: { name: 'ws', ecosystem: 'npm' }, version: '8.18.3' },
    { package: { name: 'vite', ecosystem: 'npm' }, version: '7.2.4' },
    { package: { name: 'react', ecosystem: 'npm' }, version: '19.2.0' },
  ];
  const devOnly = { ws: false, vite: true, react: false };

  it('aligns results with queries positionally, as OSV returns them', () => {
    const hits = collectHits(
      queries,
      [{ vulns: [{ id: 'GHSA-aaaa' }] }, { vulns: [{ id: 'GHSA-bbbb' }] }, {}],
      devOnly,
    );
    expect(hits.map((h) => h.name)).toEqual(['ws', 'vite']);
    expect(hits[0].version).toBe('8.18.3');
  });

  it('marks production reachability from the dev map', () => {
    const hits = collectHits(queries, [{ vulns: [{ id: 'GHSA-aaaa' }] }, { vulns: [{ id: 'GHSA-bbbb' }] }, {}], devOnly);
    expect(hits.find((h) => h.name === 'ws').production).toBe(true);
    expect(hits.find((h) => h.name === 'vite').production).toBe(false);
  });

  it('collects every advisory id for a package', () => {
    const hits = collectHits([queries[0]], [{ vulns: [{ id: 'A' }, { id: 'B' }] }], devOnly);
    expect(hits[0].ids).toEqual(['A', 'B']);
  });

  it('returns nothing for a clean tree', () => {
    expect(collectHits(queries, [{}, {}, {}], devOnly)).toEqual([]);
  });

  it('treats an empty vulns array as clean', () => {
    expect(collectHits([queries[0]], [{ vulns: [] }], devOnly)).toEqual([]);
  });
});
