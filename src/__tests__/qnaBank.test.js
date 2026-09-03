/**
 * qnaBank.test.js — the answer bank derived from the master documents.
 *
 * The masters hold 531 interview answers written to be spoken. They are the
 * best source for the offline/instant bank and cannot be shipped wholesale, so
 * `buildQnaBank.js` condenses each to its first paragraph — which is only sound
 * when nothing later in the answer qualifies it.
 *
 * These answers are careful *because* they carry qualifications ("It reached
 * staging, not production"; "no weighted loss and no class-aware sampler").
 * Truncating one of those turns an honest answer into an overclaim. So the
 * selection rule is a safety rule, and these tests are about what it refuses.
 */
import { describe, it, expect } from 'vitest';
import { QNA_BANK } from '../data/qnaBank.generated';
import { extractPairs, selectSafe } from '../../scripts/buildQnaBank.js';
import { PROHIBITED_CLAIMS, findAssertedClaim } from '../data/claimRules';

describe('the shipped bank', () => {
  it('has entries from several experiences', () => {
    expect(QNA_BANK.length).toBeGreaterThan(20);
    expect(new Set(QNA_BANK.map((e) => e.source)).size).toBeGreaterThan(2);
  });

  it('is every entry a real question with a real answer', () => {
    for (const e of QNA_BANK) {
      expect(e.q.endsWith('?'), `not a question: ${e.q}`).toBe(true);
      expect(e.a.length, `answer too short: ${e.q}`).toBeGreaterThan(100);
    }
  });

  it('carries no classified or restricted material', () => {
    // DRDO is defence research; almost all of its answers are refused, which
    // is the rule working rather than a coverage gap.
    for (const e of QNA_BANK) {
      const blob = `${e.q} ${e.a}`.toLowerCase();
      expect(blob, `${e.q}`).not.toMatch(/classified|restricted|do not disclose/);
    }
  });

  it('asserts no claim the site is forbidden from making', () => {
    // Negation-aware: an answer that says "Not the sole engineer and not the
    // company founder" is doing the right thing, and flagging it would push
    // the writing toward vagueness rather than precision.
    for (const e of QNA_BANK) {
      for (const rule of PROHIBITED_CLAIMS) {
        const hit = findAssertedClaim(`${e.q} ${e.a}`, rule);
        expect(hit, hit ? `"${e.q}" asserts "${hit}" — ${rule.reason}` : '').toBeNull();
      }
    }
  });

  it('does keep the answers that explicitly disclaim an overstatement', () => {
    const denials = QNA_BANK.filter((e) => /not the sole|never the founder|not production/i.test(e.a));
    expect(denials.length, 'the honest disclaimers were filtered out').toBeGreaterThan(0);
  });

  it('stays small enough to ship to a browser', () => {
    const bytes = JSON.stringify(QNA_BANK).length;
    expect(bytes).toBeLessThan(60 * 1024);
  });
});

describe('selection refuses what it cannot safely condense', () => {
  const md = (q, ...paras) => `**${q}**\n\n${paras.join('\n\n')}\n`;
  const long = (s) => s.padEnd(200, ' filler text that makes this a real answer.').slice(0, 260) + '.';

  it('keeps an answer whose first paragraph stands alone', () => {
    const pairs = extractPairs(md('What did you build?', long('I built the ingestion pipeline')));
    expect(selectSafe(pairs)).toHaveLength(1);
  });

  it('REFUSES an answer qualified in a later paragraph', () => {
    // The caveat is the whole point of the answer; truncating would delete it.
    const pairs = extractPairs(
      md('Did you deploy it?', long('I built and served the detector'), 'It reached staging, not production.'),
    );
    expect(selectSafe(pairs)).toEqual([]);
  });

  it('REFUSES an answer that walks back a claim later', () => {
    const pairs = extractPairs(
      md('How did you handle imbalance?', long('Targeted augmentation across the classes'),
         "I want to be precise about what I didn't do: no weighted loss."),
    );
    expect(selectSafe(pairs)).toEqual([]);
  });

  it('KEEPS a qualification that lives in the first paragraph', () => {
    // It ships with the answer, so nothing is lost.
    const pairs = extractPairs(
      md('What was your role?', long('One of four engineers. Not the sole engineer and never the founder')),
    );
    expect(selectSafe(pairs)).toHaveLength(1);
  });

  it('refuses anything touching classified material outright', () => {
    const pairs = extractPairs(md('Which platform?', long('That configuration is classified')));
    expect(selectSafe(pairs)).toEqual([]);
  });

  it('ignores bold text that is not a question', () => {
    expect(extractPairs('**Just a label**\n\nSome prose.\n')).toEqual([]);
  });

  it('reads both heading styles', () => {
    expect(extractPairs('**What is it?**\n\nAn answer.\n')).toHaveLength(1);
    expect(extractPairs('**"What is it?"**\n\n> An answer.\n')).toHaveLength(1);
  });
});
