/**
 * careerKnowledge.test.js — the curated corpus behind the chatbot.
 *
 * The master documents this is derived from are ~390K tokens and roughly half
 * claim-boundary: ~593 "do not claim" / "UNCONFIRMED" / "confidential" markers,
 * an explicit rule that background context "may never become a resume claim",
 * and appendices of superseded wording. That is precisely why the corpus is
 * curated at build time rather than retrieved at request time — a retriever has
 * no notion of a claim boundary and would surface the paragraph a few lines
 * above the sentence forbidding it.
 *
 * So the tests that matter are the ones about what must NOT be in here.
 */
import { describe, it, expect } from 'vitest';
import { buildCareerBlock, collectBoundaries, CAREER_EXPERIENCE_NAMES } from '../data/careerKnowledge';
import { PROHIBITED_CLAIMS } from '../data/claimRules';

const block = buildCareerBlock();
const boundaries = collectBoundaries();

describe('corpus coverage', () => {
  it('covers every experience that has a master document', () => {
    expect(CAREER_EXPERIENCE_NAMES).toEqual(
      expect.arrayContaining(['DELOITTE', 'DRDO', 'PRANA', 'SUNBASE', 'PEAKROUTINE', 'VIMAAN', 'ANTARIKSH']),
    );
  });

  it('renders a block large enough to be useful and small enough to cache', () => {
    const approxTokens = block.length / 4;
    expect(approxTokens).toBeGreaterThan(4000);
    expect(approxTokens).toBeLessThan(40000);
  });
});

describe('boundaries', () => {
  it('states the disclosure limits on the defence research', () => {
    // DRDO work is defence research whose master enumerates what may not be
    // said. Shipping a chatbot over that material without these would be
    // indefensible.
    const joined = boundaries.join('\n').toLowerCase();
    expect(joined).toContain('do not disclose');
    expect(joined).toMatch(/platform identity|classified/);
  });

  it('carries the retired claims, so the model cannot resurrect them', () => {
    expect(boundaries.join('\n')).toMatch(/10x|10×/);
  });

  it('states no empty rules', () => {
    // "Do not disclose:" with nothing after it enforces nothing and dilutes
    // the boundaries that do.
    expect(boundaries.filter((b) => /:\s*$/.test(b))).toEqual([]);
  });

  it('puts the boundaries BEFORE the claims in the prompt', () => {
    // A model that omits a claim is merely less useful; one that crosses a
    // boundary is a liability. Order encodes that priority.
    expect(block.indexOf('ABSOLUTE BOUNDARIES')).toBeLessThan(block.indexOf('VERIFIED CAREER DETAIL'));
    expect(block.startsWith('=== ABSOLUTE BOUNDARIES ===')).toBe(true);
  });
});

describe('refused material never reaches the prompt', () => {
  it('contains no superseded-appendix content', () => {
    expect(block.toLowerCase()).not.toContain('appendix c — historical');
    expect(block.toLowerCase()).not.toContain('superseded material');
  });

  it('contains no unconfirmed markers', () => {
    // "⚠️ UNCONFIRMED — DO NOT CLAIM" rows must be refused at extraction, not
    // passed through for the model to interpret.
    expect(block).not.toContain('UNCONFIRMED');
  });

  it('never states a bare claim whose own registry limits it', () => {
    // NOT a blanket ban on the phrasings in claimRules — those govern SITE
    // COPY, where "10x throughput increase" meant the retired Deloitte claim.
    // The corpus legitimately discusses the same words in other contexts: DRDO
    // has an approved "~10× in calendar time" row, and a Prana narrative
    // explains why depthwise convolutions gave ~10× wall-clock rather than the
    // 8-40× the parameter count suggests. Both are fine.
    //
    // The invariant that actually matters is that a CLAIM ROW carrying a
    // limited figure must carry its limitation on the same line, so the model
    // can never read the number without the qualifier.
    const detail = block.slice(block.indexOf('VERIFIED CAREER DETAIL'));
    const claimRows = detail.split('\n').filter((l) => l.startsWith('- '));

    const bare = claimRows.filter(
      (row) => PROHIBITED_CLAIMS.some((r) => r.pattern.test(row)) && !row.includes('(limit:'),
    );
    expect(bare, `claim rows state a limited figure without its limitation:\n${bare.join('\n')}`).toEqual([]);
  });
});
