/**
 * buildCareerKnowledge.js — derive the chatbot's knowledge from the master docs.
 *
 * THE MASTERS ARE NOT PUBLISHABLE AS-IS, AND THAT IS THE WHOLE POINT.
 * ------------------------------------------------------------------
 * The per-experience master documents (~390K tokens, kept OUTSIDE this repo)
 * are half evidence and half claim-boundary. They carry ~593 "do not claim",
 * "⚠️ UNCONFIRMED", and "confidential" markers, an explicit rule that §1 context
 * "may never become a resume claim", and appendices of superseded wording.
 *
 * That is exactly why retrieval-augmented generation over them would be worse
 * than no knowledge at all. A retriever has no notion of a claim boundary: ask
 * "did you design the satellite?" and it surfaces the paragraph describing the
 * satellite's specifications, which sits a few lines above "What I do not
 * claim: I did not design the satellite as a personal deliverable." RAG would
 * turn an integrity apparatus into a fabrication engine, on a page recruiters
 * read.
 *
 * So nothing is retrieved at request time. This script derives a small,
 * vetted, COMMITTED artifact from an allow-list of sections, and the private
 * masters never leave the author's machine.
 *
 * WHAT IS TAKEN
 *   - The narrative ladder: the 30-second / 90-second / 3-minute answers each
 *     master already contains, written in the author's own voice for exactly
 *     the questions a recruiter asks.
 *   - The claim registries: tables whose columns are literally
 *     `Claim | Value | Basis | Safe wording | Limitations`. The author has
 *     already done the safety work; this reads the "safe wording" column
 *     rather than re-deriving it.
 *   - The prohibitions ("Never X", "Do not claim Y"), which become hard
 *     constraints in the system prompt.
 *
 * WHAT IS REFUSED
 *   Superseded material, open verification items, constructed-figure
 *   registers, audit history, résumé variant archives, and — critically —
 *   section 2 of any master whose section 2 is product/background CONTEXT
 *   rather than a personal narrative (Sunbase's is; Deloitte's is not). Those
 *   are matched by HEADING TEXT, never by section number, because the
 *   numbering is not consistent across masters and a number tells you nothing
 *   about whether a passage is a claim.
 *
 * Usage:  node scripts/buildCareerKnowledge.js [--masters <dir>] [--check]
 *   --check  verify the committed artifact is current, without rewriting it.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';

const DEFAULT_MASTERS = join(homedir(), 'Desktop', 'Resumes', 'masters');
/**
 * Emitted as a TS module, not JSON. Node ESM requires an import attribute for
 * JSON (`with { type: 'json' }`) while bundlers do not, and this repo has
 * already shipped one production outage from exactly that class of
 * Node-vs-bundler divergence (extensionless relative imports resolving under
 * esbuild but not in the lambda). A plain module has no such split.
 */
const OUT = resolve(process.cwd(), 'src/data/careerKnowledge.generated.ts');

/** Headings that introduce a spoken narrative about what the author did. */
const NARRATIVE_HEADINGS = [
  /thirty seconds/i,
  /ninety seconds/i,
  /three minutes/i,
  /^the line$/i,
  /the interview script/i,
];

/**
 * Tables that enumerate what must NOT be said. DRDO's work is defence
 * research and its master carries an explicit "Safe to discuss | Do not
 * disclose" boundary covering platform identity, classified configurations and
 * numerical results. Publishing a chatbot over that material without lifting
 * those boundaries out first would be indefensible, so they are extracted as
 * hard prohibitions rather than merely skipped.
 */
const DISCLOSURE_COLUMNS = [/do not disclose/i, /do not claim/i, /prohibited/i, /never/i];

/** Appendices holding vetted, claimable facts. */
const REGISTRY_HEADINGS = [
  /claim and evidence registry/i,
  /metrics and evidence registry/i,
  /canonical facts/i,
];

/**
 * Never extract from these, whatever they are numbered. Superseded wording and
 * unverified items are the two things most damaging to repeat in public.
 */
const REFUSED_HEADINGS = [
  /superseded/i,
  /open verification/i,
  /constructed figures/i,
  /audit history/i,
  /resume variant archive/i,
  /source index/i,
  /glossary/i,
];

/** "2.1 Thirty seconds — recruiter screen" -> "Thirty seconds — recruiter screen" */
const unnumber = (h) => String(h).replace(/^\s*(?:\d+(?:\.\d+)*)\s*/, '').trim();

const matches = (text, patterns) => {
  const t = unnumber(text);
  return patterns.some((p) => p.test(t) || p.test(text));
};

/** Split a markdown doc into { heading, level, body } sections. */
export function splitSections(md) {
  const lines = md.split('\n');
  const sections = [];
  let current = null;
  for (const line of lines) {
    const m = /^(#{1,6})\s+(.*)$/.exec(line);
    if (m) {
      if (current) sections.push(current);
      current = { level: m[1].length, heading: m[2].trim(), body: [] };
    } else if (current) {
      current.body.push(line);
    }
  }
  if (current) sections.push(current);
  return sections.map((s) => ({ ...s, body: s.body.join('\n').trim() }));
}

/** Parse a markdown table into row objects keyed by header cell. */
export function parseTable(body) {
  const rows = body.split('\n').filter((l) => l.trim().startsWith('|'));
  if (rows.length < 2) return [];
  const cells = (l) => l.split('|').slice(1, -1).map((c) => c.trim());
  const header = cells(rows[0]).map((h) => h.toLowerCase());
  return rows
    .slice(2) // skip the |---| separator
    .map(cells)
    .filter((r) => r.length === header.length && r.some(Boolean))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

/** Strip markdown emphasis so the prompt reads as prose. */
const clean = (s) =>
  String(s || '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export function extractMaster(name, md) {
  const sections = splitSections(md);
  const narratives = [];
  const claims = [];
  const prohibitions = new Set();

  let refusedDepth = null;
  for (const s of sections) {
    // Once inside a refused appendix, skip until a heading at the same or
    // shallower level ends it.
    if (refusedDepth !== null) {
      if (s.level <= refusedDepth) refusedDepth = null;
      else continue;
    }
    if (matches(s.heading, REFUSED_HEADINGS)) {
      refusedDepth = s.level;
      continue;
    }

    if (matches(s.heading, NARRATIVE_HEADINGS) && s.body) {
      const prose = s.body
        .split('\n')
        .filter((l) => !l.trim().startsWith('|') && !l.trim().startsWith('>'))
        .join(' ');
      if (clean(prose).length > 80) {
        narratives.push({ heading: s.heading, text: clean(prose) });
      }
    }

    if (matches(s.heading, REGISTRY_HEADINGS)) {
      // An appendix is usually a level-1 heading whose tables live in deeper
      // child sections, so gather the subtree rather than just this body.
      const idx = sections.indexOf(s);
      let subtree = s.body;
      for (let j = idx + 1; j < sections.length; j++) {
        if (sections[j].level <= s.level) break;
        if (matches(sections[j].heading, REFUSED_HEADINGS)) break;
        subtree += `\n${sections[j].body}`;
      }
      for (const row of parseTable(subtree)) {
        // Registries come in two shapes: `Claim | Value | ... | Safe wording`
        // and Sunbase's plainer `Field | Value`. Both are vetted reference
        // tables; only the column names differ.
        const claim = clean(row.claim || row.fact || row.metric || row.field || '');
        const value = clean(row.value || row.figure || row.technology || '');
        const safe = clean(row['safe wording'] || row.wording || '');
        const limits = clean(row.limitations || row.limitation || '');
        if (!claim && !safe) continue;
        // A row whose own limitation retires it must not become a claim.
        if (/retired|never claim|do not claim|verbal only|confidential/i.test(limits)) {
          prohibitions.add(`${claim || safe}: ${limits}`);
          continue;
        }
        claims.push({ claim, value, safe, limits });
      }
    }
  }

  // Disclosure-boundary tables anywhere in the document.
  for (const s2 of sections) {
    for (const row of parseTable(s2.body)) {
      for (const [col, cell] of Object.entries(row)) {
        if (!cell) continue;
        if (!DISCLOSURE_COLUMNS.some((p) => p.test(col))) continue;
        const text = clean(cell);
        // Separator rows and empty cells produce "Do not disclose:" with
        // nothing after it, which is noise in the prompt and unenforceable.
        if (text.length < 4 || /^-+$/.test(text)) continue;
        prohibitions.add(`Do not disclose: ${text}`);
      }
    }
  }

  // Hard prohibitions stated anywhere in the doc.
  for (const line of md.split('\n')) {
    const m = /(?:^|\s)(?:\*\*)?Never\s+["“]?([^."*|]{3,80})/i.exec(line);
    if (m && clean(m[1]).length >= 4) prohibitions.add(`Never ${clean(m[1])}`);
  }

  return { name, narratives, claims, prohibitions: [...prohibitions].sort() };
}

function main() {
  const args = process.argv.slice(2);
  const dirArg = args.indexOf('--masters');
  const dir = dirArg >= 0 ? args[dirArg + 1] : DEFAULT_MASTERS;
  const check = args.includes('--check');

  if (!existsSync(dir)) {
    console.error(
      `Master documents not found at ${dir}.\n` +
        `They are intentionally outside this repo. Pass --masters <dir>, or skip: ` +
        `the committed artifact at src/data/careerKnowledge.generated.json is what ships.`,
    );
    process.exit(check ? 0 : 2);
  }

  const files = readdirSync(dir).filter((f) => /_MASTER\.md$/.test(f)).sort();
  const experiences = files.map((f) =>
    extractMaster(f.replace(/_MASTER\.md$/, ''), readFileSync(join(dir, f), 'utf8')),
  );

  const artifact = {
    _comment:
      'GENERATED by scripts/buildCareerKnowledge.js from private master documents. ' +
      'Do not edit by hand — edit the masters and regenerate. Only vetted, ' +
      'claim-registry-approved material appears here; superseded and unverified ' +
      'sections are refused at extraction time.',
    generatedFrom: files,
    experiences,
  };

  const json = [
    '// GENERATED FILE — do not edit.',
    '// Produced by scripts/buildCareerKnowledge.js from private master documents',
    '// that are deliberately outside this repository. Edit the masters and',
    '// regenerate; see that script for what is extracted and what is refused.',
    '',
    `export const CAREER_CORPUS = ${JSON.stringify(artifact, null, 2)};`,
    '',
    'export default CAREER_CORPUS;',
    '',
  ].join('\n');

  if (check) {
    const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
    if (current !== json) {
      console.error('careerKnowledge.generated.json is stale — re-run without --check.');
      process.exit(1);
    }
    console.log('careerKnowledge.generated.json is current.');
    return;
  }

  writeFileSync(OUT, json);
  const tok = Math.round(json.length / 4 / 100) / 10;
  console.log(`Wrote ${OUT}`);
  for (const e of experiences) {
    console.log(
      `  ${e.name.padEnd(14)} ${String(e.narratives.length).padStart(2)} narrative(s)  ` +
        `${String(e.claims.length).padStart(3)} claim(s)  ` +
        `${String(e.prohibitions.length).padStart(2)} prohibition(s)`,
    );
  }
  console.log(`  ~${tok}K tokens`);
}

if (process.argv[1] && process.argv[1].endsWith('buildCareerKnowledge.js')) main();
