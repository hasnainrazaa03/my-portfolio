/**
 * Claim-integrity rules.
 *
 * Every figure on this site traces back to a claim-and-evidence registry kept
 * outside this repo (the per-experience master documents). Those registries
 * record, for each number, the evidence behind it, the wording that is
 * defensible, and the wording that overstates it.
 *
 * This file encodes only the LAST part — phrasings the site must not use, and
 * what to say instead. It exists because the site had drifted: it claimed a
 * "10x throughput increase" for the Deloitte platform, which the registry
 * classifies as a capacity ratio (2,000 -> 20,000 cumulative transactions), not
 * a measured throughput rate. The canonical resumes had already dropped it; the
 * website and the downloadable PDF had not.
 *
 * A number that cannot survive "how did you measure that?" is worth less than
 * the weaker number that can. `claimIntegrity.test.js` enforces these.
 */

export interface ClaimRule {
  /** Case-insensitive pattern that must not appear in published content. */
  pattern: RegExp;
  /** Why the phrasing overstates the evidence. */
  reason: string;
  /** The defensible alternative. */
  instead: string;
}

export const PROHIBITED_CLAIMS: readonly ClaimRule[] = [
  {
    pattern: /10\s*[x×]\s*(throughput|increase|faster)/i,
    reason: 'a ratio of cumulative totals (2,000 -> 20,000), not a measured throughput rate',
    instead: 'state the scale — "20,000+ customer transactions over the engagement"',
  },
  {
    pattern: /\b(sole engineer|single-handedly)\b/i,
    reason: 'the platform had four core engineers',
    instead: '"led a 4-engineer team and was hands-on across the pipeline"',
  },
  {
    pattern: /\blift[-\s]to[-\s]drag\b/i,
    reason: 'the cavity L/D of 5 is length-to-depth, a geometry ratio — not an aerodynamic efficiency',
    instead: '"cavity length-to-depth ratio of 5 — open-cavity regime"',
  },
  {
    pattern: /99\.7%\s*confidence/i,
    reason: 'p = 0.003 is not a confidence level, and the inversion is a statistics error',
    instead: '"p = 0.003" stated with the test that produced it',
  },
  {
    pattern: /\bexperimental sensor data\b/i,
    reason: 'implies experimental validation that was not performed',
    instead: 'describe the simulation setup without implying wind-tunnel or flight data',
  },
  {
    pattern: /\bdeployed to production\b/i,
    reason: 'the detector service ran in staging',
    instead: '"served from a containerized FastAPI microservice" (staging)',
  },
  // ── Project Vimaan (VIMAAN_MASTER.md, "Verb and claim constraints") ──────
  {
    pattern: /inter-?process communication/i,
    reason:
      "Vimaan's hand-off is a daemon worker thread and a queue.Queue inside ONE process; the site said inter-process for months",
    instead: '"a worker thread hands each command to the simulator\'s main thread through a thread-safe queue"',
  },
  {
    pattern: /\bUDP\b/i,
    reason: 'the master rules UDP out: no Vimaan component communicates over UDP',
    instead: 'describe the in-process worker-thread queue',
  },
  {
    pattern: /INT8[^.]{0,80}\b(faster|speed-?ups?|lower latency|efficient (offline )?inference)\b/i,
    reason: 'dynamic INT8 was measured for memory, not speed; the speed came from the parity-verified ONNX export',
    instead: '"INT8 quantization to cut the memory footprint, and an ONNX Runtime export for inference"',
  },
  {
    pattern: /\b89,?000\b/i,
    reason: 'the pre-v11 training set, which included word-form augmentation later removed; v11 is 69,918 rows',
    instead: '"a 69,918-row training set"',
  },
  {
    pattern: /\b(sub-?\s?500\s?ms|under 500\s?ms)\b/i,
    reason: 'the microphone-to-command path has never been measured end to end',
    instead: 'describe the architecture, not a latency',
  },
  // ── Orbit Expense Tracker, formerly USC Ledger (ORBIT_EXPENSE_TRACKER_MASTER.md; code wins over README)
  {
    pattern: /\bP2034\b/i,
    reason: 'the Prisma write-conflict code appears only in the README narrative; nothing in the code handles or retries it',
    instead: 'describe the idempotent full-state reconcile that replaced the transaction',
  },
  {
    pattern: /\batomic transactions?\b/i,
    reason: 'the budget and semester reconciles deliberately run without a transaction (it was removed after Atlas commit acks failed)',
    instead: '"idempotent full-state saves, so retries converge"',
  },
  {
    pattern: /\b(surgical sync|reconciliation engine)\b/i,
    reason: 'sequential upserts that rely on idempotency; nothing locks or orders overlapping requests, so it is not an engine that prevents races',
    instead: '"the client sends the complete desired state and the server reconciles it"',
  },
  // ── Manzil Recipe Vault (MANZIL_RECIPE_VAULT_MASTER.md) ─────────────────
  {
    pattern: /\bcollaborative recipe\b/i,
    reason: 'recipes, collections and history are owner-only; the social features are follows, comments and ratings, not co-editing',
    instead: '"a recipe-sharing web app"',
  },
];

/**
 * Find a prohibited phrasing that is actually being ASSERTED.
 *
 * A denial is not an overclaim. The strongest answer in the bank reads "One of
 * four founding engineers … Not the sole engineer and not the company founder"
 * — the phrase appears precisely so it can be ruled out, and flagging that
 * would push the writing toward vagueness instead of precision.
 *
 * So a match is ignored when a negation immediately precedes it.
 *
 * @returns the offending text, or null when the content is clean.
 */
export function findAssertedClaim(text: string, rule: ClaimRule): string | null {
  const haystack = String(text ?? '');
  // `g` so every occurrence is considered, not just the first.
  const re = new RegExp(rule.pattern.source, `${rule.pattern.flags.replace(/g/g, '')}g`);
  for (const m of haystack.matchAll(re)) {
    const before = haystack.slice(Math.max(0, m.index - 24), m.index).toLowerCase();
    if (/\b(not|never|no|n[o']t|without|rather than|instead of)\s*(the|a|an)?\s*$/.test(before)) {
      continue;
    }
    return m[0];
  }
  return null;
}
