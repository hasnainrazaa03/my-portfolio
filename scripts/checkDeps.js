/**
 * Blocking dependency-vulnerability gate.
 *
 * WHY NOT JUST FLIP `continue-on-error` ON THE OSV ACTION: the lockfile carries
 * advisories that cannot be fixed from here. At the time of writing, six
 * packages are flagged — js-yaml, minimatch, path-to-regexp, undici, ajv,
 * smol-toml — every one of them a transitive dependency pinned by its parent
 * (@vercel/node, lighthouse, eslint), and every one dev-only. A blanket block
 * would fail CI on day one for problems this repo cannot act on, which trains
 * everyone to ignore the red X. That is worse than no gate.
 *
 * So the policy is the one that IS actionable and does hold today:
 *
 *   FAIL on any advisory reachable from production dependencies.
 *   REPORT dev-only advisories without failing.
 *
 * The dev/prod split comes from npm's own `dev` flag in package-lock.json: a
 * package is production-reachable if ANY install path to it is non-dev. It is
 * a real distinction here — a vite advisory affects a build machine, whereas
 * anything in the serverless functions is exposed to internet traffic.
 *
 * This complements rather than replaces the OSV scanner action, which still
 * runs non-blocking for the full picture.
 *
 * Usage:  node scripts/checkDeps.js [--json]
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OSV_BATCH = 'https://api.osv.dev/v1/querybatch';
const OSV_VULN = 'https://api.osv.dev/v1/vulns';

/**
 * Build one OSV query per distinct package@version in the lockfile, plus a map
 * of which packages are production-reachable.
 *
 * @param {object} lock parsed package-lock.json
 */
export function lockfileQueries(lock) {
  const queries = [];
  const seen = new Set();
  /** @type {Record<string, boolean>} name -> devOnly */
  const devOnly = {};

  for (const [path, meta] of Object.entries(lock?.packages || {})) {
    if (!path.startsWith('node_modules/')) continue;
    const name = path.split('node_modules/').pop();
    const version = meta?.version;
    if (!version) continue;

    // Reachable from prod if ANY install path is non-dev.
    devOnly[name] = (devOnly[name] ?? true) && Boolean(meta.dev);

    const key = `${name}@${version}`;
    if (seen.has(key)) continue;
    seen.add(key);
    queries.push({ package: { name, ecosystem: 'npm' }, version });
  }
  return { queries, devOnly };
}

/**
 * Fold OSV's batch response together with the queries that produced it.
 * OSV returns results positionally, so index alignment is the contract.
 */
export function collectHits(queries, results, devOnly) {
  const hits = [];
  results.forEach((res, i) => {
    const vulns = res?.vulns;
    if (!vulns?.length) return;
    const { name } = queries[i].package;
    hits.push({
      name,
      version: queries[i].version,
      ids: vulns.map((v) => v.id),
      production: !devOnly[name],
    });
  });
  return hits;
}

async function main() {
  const lock = JSON.parse(readFileSync(join(ROOT, 'package-lock.json'), 'utf8'));
  const { queries, devOnly } = lockfileQueries(lock);
  console.log(`Querying OSV for ${queries.length} packages...`);

  const res = await fetch(OSV_BATCH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queries }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    // A gate that cannot reach its data must not silently pass, but neither
    // should an OSV outage block every merge. Surface it and exit non-blocking.
    console.error(`OSV request failed: HTTP ${res.status}. Skipping (not a pass).`);
    process.exit(0);
  }

  const hits = collectHits(queries, (await res.json()).results || [], devOnly);
  const prod = hits.filter((h) => h.production);
  const dev = hits.filter((h) => !h.production);

  // Severities only for the ones that can fail the build — keeps the request
  // count to roughly zero on a healthy tree.
  const severity = {};
  for (const id of [...new Set(prod.flatMap((h) => h.ids))]) {
    try {
      const r = await fetch(`${OSV_VULN}/${id}`, { signal: AbortSignal.timeout(20_000) });
      severity[id] = r.ok ? (await r.json())?.database_specific?.severity || 'UNKNOWN' : 'UNKNOWN';
    } catch {
      severity[id] = 'UNKNOWN';
    }
  }

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ prod, dev, severity }, null, 2));
  } else {
    if (dev.length) {
      console.log(`\nDev-only advisories (reported, not blocking) — ${dev.length} package(s):`);
      for (const h of dev) console.log(`  - ${h.name}@${h.version}: ${h.ids.join(', ')}`);
    }
    if (prod.length) {
      console.log(`\nPRODUCTION-reachable advisories — ${prod.length} package(s):`);
      for (const h of prod) {
        console.log(`  - ${h.name}@${h.version}`);
        for (const id of h.ids) console.log(`      ${severity[id] || 'UNKNOWN'}  ${id}  https://osv.dev/${id}`);
      }
    }
  }

  if (prod.length) {
    console.error(
      `\nFAIL: ${prod.length} production dependency/ies carry advisories.\n` +
        `Fix with \`npm update\`, or bump the direct dependency that pins them.\n` +
        `If it is genuinely unreachable, say so explicitly rather than widening this gate.`,
    );
    process.exit(1);
  }
  console.log(`\nOK: no production-reachable advisories (${dev.length} dev-only, reported above).`);
}

if (process.argv[1] && process.argv[1].endsWith('checkDeps.js')) {
  main().catch((err) => {
    console.error('checkDeps failed:', err);
    process.exit(2);
  });
}
