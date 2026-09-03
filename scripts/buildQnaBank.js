/**
 * buildQnaBank.js — derive the local answer bank from the master documents.
 *
 * The masters carry 531 interview questions with answers written to be spoken.
 * They are the best possible source for the offline/instant answer bank, and
 * they cannot be shipped wholesale: the answers run several paragraphs each,
 * and this corpus loads in the browser.
 *
 * SO THE SELECTION RULE IS A SAFETY RULE, NOT A SIZE RULE.
 * --------------------------------------------------------
 * Condensing an answer to its first paragraph is only sound when nothing later
 * in that answer qualifies it. These answers are careful precisely because they
 * carry qualifications — "It reached staging, not production", "I want to be
 * precise about what I didn't do: no weighted loss and no class-aware sampler".
 * Truncating those turns an honest answer into an overclaim, which is the exact
 * failure this whole knowledge pipeline exists to prevent.
 *
 * So a question is included ONLY when its first paragraph stands alone: long
 * enough to be a real answer, and with no later paragraph that walks it back.
 * Anything whose caveat lives further down is skipped entirely rather than
 * trimmed. The server prompt still has the full registry for those.
 *
 * Two heading styles exist across the masters and both are read:
 *   **What is Pega and why use it?**   -> plain paragraphs follow
 *   **"Walk me through the project."** -> a `>` blockquote follows
 *
 * Usage:  node scripts/buildQnaBank.js [--masters <dir>] [--check]
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';

const DEFAULT_MASTERS = join(homedir(), 'Desktop', 'Resumes', 'masters');
const OUT = resolve(process.cwd(), 'src/data/qnaBank.generated.ts');

/** Per-experience cap, so one verbose master cannot dominate the bank. */
const MAX_PER_MASTER = 14;
const MIN_ANSWER_CHARS = 140;
const MAX_ANSWER_CHARS = 900;

/**
 * A later paragraph containing any of these qualifies the first one, so the
 * answer cannot be safely truncated.
 */
const QUALIFIERS = [
  /\bnot production\b/i,
  /\bstaging\b/i,
  /\bdid ?n[o']t\b/i,
  /\bnever\b/i,
  /\bno\b[^.]{0,30}\b(weighted|sampler|clinical|deployment)\b/i,
  /\bto be precise\b/i,
  /\bhonest version\b/i,
  /\bcaveat\b/i,
  /\bunconfirmed\b/i,
  /\bdo not claim\b/i,
  /\bconfidential\b/i,
  /\bresearch-grade\b/i,
  /\bI would not claim\b/i,
  /\bthat is different from\b/i,
];

/** Content that must never reach a public answer bank at all. */
const REFUSED = [/do not disclose/i, /classified/i, /restricted/i, /⚠️/];

const tidy = (s) =>
  String(s)
    .replace(/^>\s?/gm, '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Pull `**Question?**` / `**"Question"**` blocks and the prose beneath them. */
export function extractPairs(md) {
  const lines = md.split('\n');
  const pairs = [];
  const QUESTION = /^\*\*(?:Follow-up:\s*)?["“]?(.{8,160}?)["”]?\*\*\s*$/;

  for (let i = 0; i < lines.length; i++) {
    const m = QUESTION.exec(lines[i]);
    if (!m) continue;
    const question = m[1].trim();
    // Bold text that is not a question is a label, not a prompt.
    if (!question.endsWith('?')) continue;

    // Collect until the next question, heading, or table.
    const body = [];
    for (let j = i + 1; j < lines.length; j++) {
      const l = lines[j];
      if (QUESTION.test(l) || /^#{1,6}\s/.test(l) || l.trim().startsWith('|')) break;
      body.push(l);
    }

    const paragraphs = body
      .join('\n')
      .split(/\n\s*\n/)
      .map(tidy)
      .filter((p) => p.length > 0);
    if (!paragraphs.length) continue;

    pairs.push({ question, paragraphs });
  }
  return pairs;
}

/** Keep only answers whose first paragraph stands alone. See the header. */
export function selectSafe(pairs) {
  const kept = [];
  for (const { question, paragraphs } of pairs) {
    const [first, ...rest] = paragraphs;
    if (!first || first.length < MIN_ANSWER_CHARS) continue;
    if (first.length > MAX_ANSWER_CHARS) continue;
    // Must read as a finished thought, not a lead-in to a list.
    if (!/[.!?]$/.test(first)) continue;

    const whole = paragraphs.join(' ');
    if (REFUSED.some((r) => r.test(whole)) || REFUSED.some((r) => r.test(question))) continue;

    // The decisive rule: a qualification further down means truncating lies.
    if (rest.some((p) => QUALIFIERS.some((q) => q.test(p)))) continue;
    if (QUALIFIERS.some((q) => q.test(first))) {
      // A qualification IN the first paragraph is fine — it ships with it.
    }

    kept.push({ q: question, a: first });
  }
  return kept;
}

function main() {
  const args = process.argv.slice(2);
  const dirArg = args.indexOf('--masters');
  const dir = dirArg >= 0 ? args[dirArg + 1] : DEFAULT_MASTERS;
  const check = args.includes('--check');

  if (!existsSync(dir)) {
    console.error(`Master documents not found at ${dir}. The committed bank is what ships.`);
    process.exit(check ? 0 : 2);
  }

  const entries = [];
  const files = readdirSync(dir).filter((f) => /_MASTER\.md$/.test(f)).sort();
  for (const f of files) {
    const name = f.replace(/_MASTER\.md$/, '');
    const safe = selectSafe(extractPairs(readFileSync(join(dir, f), 'utf8')));
    // Prefer the shortest complete answers: they read best in a chat bubble
    // and cost the least on a corpus that loads in the browser.
    safe.sort((a, b) => a.a.length - b.a.length);
    const picked = safe.slice(0, MAX_PER_MASTER).map((e) => ({ ...e, source: name }));
    entries.push(...picked);
    console.log(`  ${name.padEnd(14)} ${String(picked.length).padStart(2)} kept of ${safe.length} safe`);
  }

  const seen = new Set();
  const deduped = entries.filter((e) => {
    const k = e.q.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const out = [
    '// GENERATED FILE — do not edit.',
    '// Produced by scripts/buildQnaBank.js from private master documents.',
    '// Only answers whose first paragraph stands alone are included; anything',
    '// qualified further down is skipped rather than truncated. See the script.',
    '',
    `export const QNA_BANK: { q: string; a: string; source: string }[] = ${JSON.stringify(deduped, null, 2)};`,
    '',
    'export default QNA_BANK;',
    '',
  ].join('\n');

  if (check) {
    const cur = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
    if (cur !== out) {
      console.error('qnaBank.generated.ts is stale — re-run without --check.');
      process.exit(1);
    }
    console.log('qnaBank.generated.ts is current.');
    return;
  }

  writeFileSync(OUT, out);
  console.log(`\nWrote ${OUT}`);
  console.log(`  ${deduped.length} entries, ${(out.length / 1024).toFixed(1)} KB raw`);
}

if (process.argv[1] && process.argv[1].endsWith('buildQnaBank.js')) main();
