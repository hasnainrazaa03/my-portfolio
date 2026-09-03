/**
 * replyFormat.test.js — reply post-processing.
 *
 * REGRESSION GUARD: the previous inline logic split on /[.!?]/, which broke
 * "3.8 GPA" into "3" + "8 GPA" and truncated URLs and abbreviations.
 */
import { describe, it, expect } from 'vitest';
import {
  formatReply,
  splitSentences,
  pickSuggestions,
  DEFAULT_SUGGESTIONS,
} from '../../api/_lib/replyFormat';

describe('splitSentences', () => {
  it('splits on real sentence boundaries', () => {
    expect(splitSentences('I built Vimaan. It uses PyTorch. Ask me more!')).toEqual([
      'I built Vimaan.',
      'It uses PyTorch.',
      'Ask me more!',
    ]);
  });

  it('does NOT split decimals — the original bug', () => {
    expect(splitSentences('I hold a 3.8 GPA at USC.')).toEqual(['I hold a 3.8 GPA at USC.']);
  });

  it('does NOT split URLs or version numbers', () => {
    const text = 'See github.com/hasnainrazaa03 for the code built on React 19.2.';
    expect(splitSentences(text)).toEqual([text]);
  });

  it('keeps the original terminator instead of forcing a period', () => {
    expect(splitSentences('Want the details? I can share them.')).toEqual([
      'Want the details?',
      'I can share them.',
    ]);
  });
});

describe('pickSuggestions', () => {
  it('returns the requested count of distinct items', () => {
    const picks = pickSuggestions(2);
    expect(picks).toHaveLength(2);
    expect(new Set(picks).size).toBe(2);
    picks.forEach((p) => expect(DEFAULT_SUGGESTIONS).toContain(p));
  });

  it('is deterministic under an injected rand', () => {
    expect(pickSuggestions(2, DEFAULT_SUGGESTIONS, () => 0)).toEqual(
      pickSuggestions(2, DEFAULT_SUGGESTIONS, () => 0),
    );
  });

  it('never returns more than the pool holds', () => {
    expect(pickSuggestions(5, ['a', 'b'])).toHaveLength(2);
  });
});

describe('formatReply', () => {
  const rand = () => 0;

  it('preserves a decimal that the old splitter destroyed', () => {
    const out = formatReply('I hold a 3.8 GPA at USC.', { rand });
    expect(out).toContain('3.8 GPA');
    expect(out).not.toContain('3 GPA');
  });

  it('appends exactly one suggestion block', () => {
    const out = formatReply('I built Vimaan.', { rand });
    expect(out.match(/\[Ask about:/g)).toHaveLength(1);
  });

  it('does not stack a second block onto a reply that already has one', () => {
    const out = formatReply('I built Vimaan. [Ask about: the stack or the impact?]', { rand });
    expect(out.match(/\[Ask about:/g)).toHaveLength(1);
    expect(out).toContain('the stack or the impact?');
  });

  it('truncates at a sentence boundary, not mid-token', () => {
    const out = formatReply('One. Two. Three. Four. Five.', { maxSentences: 2, rand });
    expect(out).toContain('One. Two.');
    expect(out).not.toContain('Three');
  });

  it('closes an unterminated reply cut off by max_tokens', () => {
    const out = formatReply('I work on computer vision at USC', { rand });
    expect(out).toMatch(/USC\.\s\[Ask about:/);
  });

  it('returns empty string for empty input rather than a bare suffix', () => {
    expect(formatReply('   ')).toBe('');
    expect(formatReply(null)).toBe('');
  });
});

/**
 * Truncated affordances.
 *
 * Seen in production twice: the model emits "[Ask about: my coursework,
 * PeakRoutine." with no closing bracket, the closed-form regex misses it, the
 * fragment is treated as prose, and a second affordance is appended after it.
 */
describe('formatReply — unterminated suggestion block', () => {
  const fixed = () => 0;

  it('does not stack a second affordance on a truncated one', () => {
    const out = formatReply('I study at USC. [Ask about: my coursework, PeakRoutine.', {
      rand: fixed,
    });
    expect(out.match(/\[Ask about:/g)).toHaveLength(1);
  });

  it('keeps the real answer when discarding the fragment', () => {
    const out = formatReply('I study at USC. [Ask about: my cour', { rand: fixed });
    expect(out).toMatch(/^I study at USC\./);
    expect(out).not.toContain('my cour]');
  });

  it('still preserves a properly closed affordance', () => {
    expect(formatReply('I use React. [Ask about: my stack?]', { rand: fixed })).toBe(
      'I use React. [Ask about: my stack?]',
    );
  });

  it('leaves an unrelated bracket alone', () => {
    const out = formatReply('See [1] for the benchmark.', { rand: fixed });
    expect(out).toContain('[1]');
  });
});
