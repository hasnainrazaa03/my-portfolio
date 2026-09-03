/**
 * Bundle-size budget.
 *
 * WHY THE INITIAL PAYLOAD, NOT THE TOTAL: total `dist/` size is a poor signal
 * for this app. Most sections are `lazy()`, so a chunk that only loads when a
 * visitor scrolls to it costs nothing on first paint. What matters is the set
 * of assets `index.html` itself references — the entry script plus everything
 * it statically imports (which Vite emits as `modulepreload` links) plus the
 * stylesheet. That is the bytes between a visitor and first render.
 *
 * That distinction is not academic. A `manualChunks` entry for
 * react-github-calendar looked harmless and was measured at zero cost, but the
 * chunk it produced absorbed Vite's shared `__vitePreload` helper, which every
 * lazy chunk imports — so the chunk became eager and pulled 23.8 KB gz of a
 * below-the-fold contribution calendar onto the critical path, silently
 * defeating the `lazy()` on GitHubSection. A total-bytes budget would not have
 * moved at all. This one would have caught it.
 *
 * Sizes are gzip, because that is what the CDN serves.
 *
 * MEASURE A PRODUCTION-SHAPED BUILD. Several dependencies are gated on env
 * vars: with no `VITE_SENTRY_DSN`, `import.meta.env.VITE_SENTRY_DSN` is
 * undefined and Rollup drops @sentry/react entirely. A budget run against that
 * build understated the real payload by ~28 KB gz — it read 137 KB while
 * production served 166 KB. CI now builds with a placeholder DSN so the
 * numbers describe what visitors download; do the same locally before
 * trusting a figure from this script.
 *
 * Usage:  node scripts/checkBundleSize.js [--json] [--update]
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const BUDGET_FILE = join(ROOT, 'bundle-budget.json');

/** Assets referenced directly by index.html: the entry, its preloads, the CSS. */
export function parseEagerAssets(html) {
  const names = new Set();
  // <script src>, <link rel=modulepreload href>, <link rel=stylesheet href>
  for (const m of html.matchAll(/(?:src|href)="[^"]*\/assets\/([^"]+)"/g)) {
    names.add(m[1]);
  }
  return [...names].sort();
}

/** @returns {{name: string, gzip: number}[]} */
function measure(dist, names) {
  return names.map((name) => {
    const file = join(dist, 'assets', name);
    if (!existsSync(file)) throw new Error(`index.html references a missing asset: ${name}`);
    return { name, gzip: gzipSync(readFileSync(file), { level: 9 }).length };
  });
}

/**
 * Strip Vite's content hash so budgets survive a rebuild:
 * `index-CxSCiRDP.js` -> `index.js`.
 *
 * Matches EXACTLY 8 characters, which is Vite's default hash length, rather
 * than `{8,}`. The hash alphabet is base64url and so includes `-`, which makes
 * a greedy pattern ambiguous in both directions: `chevron-right-BdWg8mub.js`
 * would lose part of its real name, while `index-D3G-sMgf.css` has a hyphen
 * INSIDE the hash and cannot be split on the last one. Fixing the width is the
 * only reading that gets both right.
 */
export function stripHash(name) {
  return name.replace(/-[A-Za-z0-9_-]{8}(\.[a-z0-9]+)$/, '$1');
}

export function evaluate(assets, budget) {
  const total = assets.reduce((n, a) => n + a.gzip, 0);
  const rows = assets.map((a) => {
    const key = stripHash(a.name);
    const limit = budget.assets?.[key];
    return { ...a, key, limit, over: limit != null && a.gzip > limit };
  });
  return {
    rows,
    total,
    totalLimit: budget.totalInitialGzip,
    totalOver: budget.totalInitialGzip != null && total > budget.totalInitialGzip,
    // A new eager asset is itself the regression worth catching: it means
    // something that used to be lazy is now on the critical path.
    unbudgeted: rows.filter((r) => r.limit == null).map((r) => r.key),
  };
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

function main() {
  const args = process.argv.slice(2);
  if (!existsSync(DIST)) {
    console.error('dist/ not found — run `npm run build` first.');
    process.exit(2);
  }

  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  const assets = measure(DIST, parseEagerAssets(html));

  if (args.includes('--update')) {
    const budget = {
      _comment:
        'gzip bytes for the INITIAL payload (index.html + its modulepreloads + CSS). ' +
        'Regenerate with `node scripts/checkBundleSize.js --update` when a change is intended.',
      totalInitialGzip: Math.ceil((assets.reduce((n, a) => n + a.gzip, 0) * 1.1) / 1024) * 1024,
      assets: Object.fromEntries(
        assets
          .map((a) => [stripHash(a.name), Math.ceil((a.gzip * 1.1) / 1024) * 1024])
          .sort(([a], [b]) => a.localeCompare(b)),
      ),
    };
    writeFileSync(BUDGET_FILE, `${JSON.stringify(budget, null, 2)}\n`);
    console.log(`Wrote ${BUDGET_FILE} (current + 10% headroom).`);
    return;
  }

  if (!existsSync(BUDGET_FILE)) {
    console.error('bundle-budget.json not found — create it with --update.');
    process.exit(2);
  }
  const budget = JSON.parse(readFileSync(BUDGET_FILE, 'utf8'));
  const result = evaluate(assets, budget);

  if (args.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('Initial payload (gzip) — assets index.html loads before first render:\n');
    for (const r of result.rows) {
      const limit = r.limit == null ? 'unbudgeted' : kb(r.limit);
      console.log(
        `  ${r.over ? 'x' : 'ok'}  ${r.key.padEnd(26)} ${kb(r.gzip).padStart(9)} / ${limit}`,
      );
    }
    const t = result.totalLimit == null ? 'n/a' : kb(result.totalLimit);
    console.log(`\n  ${result.totalOver ? 'x' : 'ok'}  ${'TOTAL'.padEnd(26)} ${kb(result.total).padStart(9)} / ${t}`);
  }

  const failures = [
    ...result.rows.filter((r) => r.over).map((r) => `${r.key} is ${kb(r.gzip)}, over its ${kb(r.limit)} budget`),
    ...(result.totalOver ? [`initial payload is ${kb(result.total)}, over the ${kb(result.totalLimit)} budget`] : []),
    ...result.unbudgeted.map(
      (k) =>
        `${k} is newly on the critical path with no budget — if a lazy chunk became eager, ` +
        `that is the regression; if it is intended, re-run with --update`,
    ),
  ];

  if (failures.length) {
    console.error(`\nBundle budget exceeded:\n${failures.map((f) => `  - ${f}`).join('\n')}`);
    process.exit(1);
  }
  console.log('\nWithin budget.');
}

// Only run when invoked directly, so the pure helpers stay importable in tests.
if (process.argv[1] && process.argv[1].endsWith('checkBundleSize.js')) main();
