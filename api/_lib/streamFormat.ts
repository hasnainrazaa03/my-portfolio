/**
 * streamFormat.ts — incremental application of the reply formatter.
 *
 * WHY THIS IS NOT JUST "SEND THE TOKENS"
 * --------------------------------------
 * `formatReply` is a whole-text transform: it caps the answer at 3 sentences
 * and appends exactly one "[Ask about: …]" affordance, which the UI renders as
 * clickable chips. Streaming raw model output would break both halves visibly:
 *
 *   - The model regularly writes 5+ sentences. The reader would watch all of
 *     them arrive, then see the text snap back to 3 when the final value
 *     replaced it. A correction the user can see is worse than latency.
 *   - The model often emits its own "[Ask about: …]" block. Streamed verbatim,
 *     the raw bracket text would flash on screen before turning into chips.
 *
 * So the cap is enforced *as tokens arrive*: this only ever emits text the
 * final answer will also contain, which makes the stream a strict prefix of the
 * result. The UI can append blindly and never has to walk anything back.
 *
 * Reaching the cap also means the rest of the completion is dead weight, so
 * `push` reports `complete` and the caller aborts the upstream request — that
 * is a real token saving on every long answer, not just a display nicety.
 */
import { formatReply, splitSentences, type FormatOptions } from './replyFormat.js';

/** The affordance `formatReply` owns. Never streamed; re-attached at the end. */
const SUFFIX_START = '[Ask about:';

/**
 * Length of the trailing run of `text` that could still grow into
 * SUFFIX_START, and must therefore be withheld.
 *
 * Without this, a completion ending mid-token at "…experience. [Ask" would
 * stream the bare "[Ask" and then have to retract it. A stray "[" that turns
 * out to be something else (a citation marker, say) is released on the next
 * chunk — a one-chunk delay, invisible at token speed.
 */
export function withheldTailLength(text: string): number {
  const max = Math.min(text.length, SUFFIX_START.length - 1);
  for (let n = max; n > 0; n--) {
    if (SUFFIX_START.startsWith(text.slice(-n))) return n;
  }
  return 0;
}

/**
 * The portion of `raw` that is safe to show: suffix removed, capped at
 * `maxSentences`.
 *
 * `capped` is true once the model has produced MORE than the cap allows, which
 * is the signal to stop reading the upstream stream.
 */
export function visiblePrefix(raw: string, maxSentences: number): { text: string; capped: boolean } {
  const suffixAt = raw.indexOf(SUFFIX_START);
  let body = suffixAt === -1 ? raw : raw.slice(0, suffixAt);

  // Only guard against a partial suffix while the real one has not appeared.
  if (suffixAt === -1) {
    const held = withheldTailLength(body);
    if (held) body = body.slice(0, body.length - held);
  }

  if (maxSentences > 0) {
    const sentences = splitSentences(body);
    if (sentences.length > maxSentences) {
      return { text: sentences.slice(0, maxSentences).join(' ').trim(), capped: true };
    }
  }

  // trimStart only: a trailing space is a legitimate boundary mid-stream, and
  // trimming it would make the next delta start with a space that never lands.
  return { text: body.trimStart(), capped: suffixAt !== -1 };
}

export interface StreamPush {
  /** Text to append on the client. Empty when this chunk produced nothing new. */
  emit: string;
  /** The visible answer is finished; stop reading the upstream stream. */
  complete: boolean;
}

/**
 * Stateful adapter from model deltas to client-safe deltas.
 *
 * Invariant: everything `push` emits, concatenated, is a prefix of what
 * `finish` returns. The client may append without ever reconciling.
 */
export function createReplyStreamer(options: FormatOptions & { maxSentences?: number } = {}) {
  const { maxSentences = 3 } = options;
  let raw = '';
  let emitted = '';
  let done = false;

  return {
    push(delta: string): StreamPush {
      if (!delta) return { emit: '', complete: done };

      // Accumulate ALWAYS, even after the visible answer is complete. `finish`
      // runs formatReply over the full text, and formatReply needs to see the
      // model's own trailing "[Ask about: …]" to preserve it instead of
      // appending a second one. Returning early here truncated `raw` mid-suffix
      // and produced "[Ask about:. [Ask about: …]".
      raw += delta;
      if (done) return { emit: '', complete: true };

      const { text, capped } = visiblePrefix(raw, maxSentences);

      // Defensive: the visible prefix must only ever grow. If a pathological
      // completion made it shrink, emit nothing rather than instruct the client
      // to delete text it has already painted.
      if (!text.startsWith(emitted)) return { emit: '', complete: capped };

      const emit = text.slice(emitted.length);
      emitted = text;
      if (capped) done = true;
      return { emit, complete: capped };
    },

    /** Canonical final reply — identical to the non-streaming response body. */
    finish(): string {
      return formatReply(raw, options);
    },

    /** Raw accumulated text, for logging and tests. */
    get rawText() {
      return raw;
    },
  };
}
