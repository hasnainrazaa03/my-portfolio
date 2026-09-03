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
