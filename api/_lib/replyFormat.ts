/**
 * replyFormat.ts — post-processing for LLM chat replies.
 *
 * WHY THIS EXISTS: the previous inline logic in api/chat.ts did
 *
 *     const sentences = answer.split(/[.!?]/);
 *     const shortAnswer = sentences.slice(0, 2).join('. ');
 *
 * which splits on EVERY period — so "I hold a 3.8 GPA" became "I hold a 3" +
 * "8 GPA", and any URL, version number, or abbreviation ("Ph.D.", "e.g.") was
 * cut mid-token. It also re-joined with ". " regardless of the original
 * punctuation, turning questions into statements.
 *
 * The splitter here only breaks on sentence-ending punctuation followed by
 * whitespace AND a capital letter / quote, which leaves decimals, URLs and
 * most abbreviations intact.
 */

/** Sentence boundary: punctuation + whitespace + start of a new sentence. */
const SENTENCE_BOUNDARY = /(?<=[.!?])\s+(?=["'“]?[A-Z0-9])/;

/** Trailing "[Ask about: X, Y?]" affordance the UI renders as chips. */
const SUGGESTION_SUFFIX = /\[Ask about:[^\]]*\]\s*$/;

export const DEFAULT_SUGGESTIONS = [
  'the tech stack behind it',
  'project details or impact',
  'my other roles',
  'skills and tools',
  'my aerospace background',
  'how to reach me',
];

/**
 * Split into sentences without breaking decimals or abbreviations.
 */
export function splitSentences(text: string): string[] {
  return text
    .split(SENTENCE_BOUNDARY)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Unbiased pick of `count` distinct items (partial Fisher-Yates).
 *
 * Replaces `arr.sort(() => 0.5 - Math.random())`, which is not a uniform
 * shuffle — comparator-based shuffles bias toward the original order and the
 * result depends on the engine's sort implementation.
 *
 * `rand` is injectable so tests are deterministic.
 */
export function pickSuggestions(
  count = 2,
  pool: readonly string[] = DEFAULT_SUGGESTIONS,
  rand: () => number = Math.random,
): string[] {
  const items = [...pool];
  const n = Math.max(0, Math.min(count, items.length));
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rand() * (items.length - i));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items.slice(0, n);
}

export interface FormatOptions {
  /** Max sentences to keep. 0 / undefined = don't truncate. */
  maxSentences?: number;
  rand?: () => number;
}

/**
 * Normalize a raw model reply: trim, optionally cap length at a sentence
 * boundary, and ensure exactly one "[Ask about: …]" affordance.
 */
export function formatReply(raw: string, options: FormatOptions = {}): string {
  const { maxSentences = 3, rand = Math.random } = options;

  let text = String(raw ?? '').trim();
  if (!text) return '';

  // Preserve an existing suggestion block rather than stacking a second one.
  const existing = text.match(SUGGESTION_SUFFIX)?.[0] ?? null;
  if (existing) text = text.slice(0, text.length - existing.length).trim();

  if (maxSentences > 0) {
    const sentences = splitSentences(text);
    if (sentences.length > maxSentences) {
      text = sentences.slice(0, maxSentences).join(' ').trim();
    }
  }

  if (!text) return '';

  // Close an unterminated sentence (e.g. a max_tokens cutoff) without
  // rewriting punctuation the model chose deliberately.
  if (!/[.!?…]$/.test(text)) text += '.';

  const suffix = existing ?? `[Ask about: ${pickSuggestions(2, DEFAULT_SUGGESTIONS, rand).join(' or ')}?]`;
  return `${text} ${suffix}`;
}
