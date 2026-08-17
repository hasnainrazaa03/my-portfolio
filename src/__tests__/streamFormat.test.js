/**
 * streamFormat.test.js — incremental reply formatting.
 *
 * The property that matters, and that every test here defends:
 *
 *   everything push() emits, concatenated, is a PREFIX of what finish() returns
 *
 * If that ever breaks, the UI shows text and then has to take it back — which
 * is exactly what streaming raw model output would do, since formatReply caps
 * at 3 sentences and owns the "[Ask about: …]" affordance.
 */
import { describe, it, expect } from 'vitest';
import {
  createReplyStreamer,
  visiblePrefix,
  withheldTailLength,
} from '../../api/_lib/streamFormat';

/** Feed text in arbitrary slices, mimicking token boundaries. */
function stream(text, sliceAt, options) {
  const s = createReplyStreamer(options);
  let out = '';
  let completedAt = -1;
  const chunks = typeof sliceAt === 'number'
    ? text.match(new RegExp(`.{1,${sliceAt}}`, 'gs')) || []
    : sliceAt;
  chunks.forEach((c, i) => {
    const { emit, complete } = s.push(c);
    out += emit;
    if (complete && completedAt === -1) completedAt = i;
  });
  return { out, streamer: s, completedAt };
}

const fixedRand = () => 0;

describe('withheldTailLength', () => {
  it('withholds a trailing partial "[Ask about:"', () => {
    expect(withheldTailLength('I work at USC. [Ask')).toBe(4);
    expect(withheldTailLength('done. [')).toBe(1);
  });

  it('withholds nothing when the tail cannot become the suffix', () => {
    expect(withheldTailLength('I have a 4.0 GPA.')).toBe(0);
    expect(withheldTailLength('see [1] for details')).toBe(0);
  });

  it('does not withhold the complete suffix marker — that is handled separately', () => {
    // A full match is sliced off by visiblePrefix, not withheld as a partial.
    expect(withheldTailLength('[Ask about:')).toBe(0);
  });

  it('handles an empty string', () => {
    expect(withheldTailLength('')).toBe(0);
  });
});

describe('visiblePrefix', () => {
  it('passes short answers through untouched', () => {
    expect(visiblePrefix('I study at USC.', 3)).toEqual({ text: 'I study at USC.', capped: false });
  });

  it('caps once the model exceeds the sentence budget', () => {
    const raw = 'One. Two. Three. Four.';
    expect(visiblePrefix(raw, 3)).toEqual({ text: 'One. Two. Three.', capped: true });
  });

  it('does not cap on a partial sentence still being written', () => {
    // Three complete sentences plus an in-flight fourth is not yet an overflow.
    const { capped } = visiblePrefix('One. Two. Thre', 3);
    expect(capped).toBe(false);
  });

  it('cuts at the suffix and reports completion', () => {
    const r = visiblePrefix('I use React. [Ask about: my stack?]', 3);
    // Trailing space retained deliberately: it is present in the final reply
    // too, so keeping it preserves the prefix invariant. Trimming the end would
    // make the next delta start with a space that never lands.
    expect(r.text).toBe('I use React. ');
    expect(r.capped).toBe(true);
  });

  it('never splits a decimal — the bug replyFormat exists for', () => {
    const r = visiblePrefix('I hold a 3.8 GPA at USC. Second. Third. Fourth.', 3);
    expect(r.text).toContain('3.8 GPA');
  });
});

describe('createReplyStreamer', () => {
  it('emits a strict prefix of the final reply', () => {
    const text = 'I study at USC. I focus on ML.';
    const { out, streamer } = stream(text, 3, { rand: fixedRand });
    expect(streamer.finish().startsWith(out)).toBe(true);
  });

  it('reassembles exactly, regardless of chunk boundaries', () => {
    const text = 'I study at USC. I focus on ML.';
    for (const size of [1, 2, 3, 7, 100]) {
      expect(stream(text, size, { rand: fixedRand }).out).toBe(text);
    }
  });

  it('never emits the raw "[Ask about:" affordance', () => {
    const text = 'I use React. [Ask about: my stack or my roles?]';
    const { out, streamer } = stream(text, 4, { rand: fixedRand });
    expect(out).not.toContain('[Ask');
    expect(out.trim()).toBe('I use React.');
    // The separating space is emitted because the final reply contains it too;
    // the prefix invariant is what matters, not cosmetic trimming.
    expect(streamer.finish().startsWith(out)).toBe(true);
  });

  it('withholds a partial suffix across a chunk boundary', () => {
    // "[As" arrives, then "k about: x?]" — the bracket must never be painted.
    const { out } = stream('Done. ', ['Done. ', '[As', 'k about: x?]'], { rand: fixedRand });
    expect(out).not.toContain('[');
  });

  it('releases a bracket that turns out not to be the suffix', () => {
    const { out } = stream('', ['See [', '1] here.'], { rand: fixedRand });
    expect(out).toBe('See [1] here.');
  });

  it('signals complete at the cap so the caller can abort upstream', () => {
    const { completedAt } = stream('One. Two. Three. Four. Five.', 6, { rand: fixedRand });
    expect(completedAt).toBeGreaterThanOrEqual(0);
  });

  it('stops emitting after completion', () => {
    const s = createReplyStreamer({ rand: fixedRand });
    s.push('One. Two. Three. Four.');
    const after = s.push(' Five. Six.');
    expect(after.emit).toBe('');
  });

  it('caps the streamed text at three sentences', () => {
    const { out } = stream('One. Two. Three. Four. Five.', 5, { rand: fixedRand });
    expect(out).toBe('One. Two. Three.');
  });

  it('finish() matches the non-streaming contract — text plus one affordance', () => {
    const { streamer } = stream('I study at USC.', 4, { rand: fixedRand });
    const final = streamer.finish();
    expect(final).toMatch(/^I study at USC\. \[Ask about: .+\?\]$/);
  });

  it('preserves the model\'s own affordance rather than stacking a second', () => {
    const { streamer } = stream('I use React. [Ask about: my stack?]', 5, { rand: fixedRand });
    expect(streamer.finish()).toBe('I use React. [Ask about: my stack?]');
  });

  it('ignores empty deltas', () => {
    const s = createReplyStreamer({ rand: fixedRand });
    expect(s.push('').emit).toBe('');
  });

  it('tracks the raw text for logging', () => {
    const s = createReplyStreamer({ rand: fixedRand });
    s.push('One. ');
    s.push('Two.');
    expect(s.rawText).toBe('One. Two.');
  });

  it('handles a completion that never terminates its last sentence', () => {
    const { out, streamer } = stream('I was cut off mid', 5, { rand: fixedRand });
    expect(streamer.finish().startsWith(out)).toBe(true);
    // formatReply closes the sentence; the streamed part is still a prefix.
    expect(streamer.finish()).toContain('I was cut off mid.');
  });
});
