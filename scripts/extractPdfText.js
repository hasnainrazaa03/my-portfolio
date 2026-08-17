/**
 * Minimal PDF text extraction — enough to check the résumé against the site.
 *
 * WHY NOT A LIBRARY: `pdf-parse` and friends pull in a full PDF engine to do
 * what amounts to "inflate the content streams and read the string literals".
 * This file is that, in about 40 lines, with no dependency to keep current and
 * nothing new in the advisory surface the dependency gate watches.
 *
 * WHAT IT DOES NOT DO: fonts with custom encodings (subset CMaps) would come
 * out as mojibake. `resumeParity.test.js` guards against that by asserting the
 * extraction contains a known anchor string — if the résumé is ever re-exported
 * from a tool that encodes differently, the test fails loudly rather than
 * silently comparing against garbage and passing.
 *
 * NOTE ON SPACING: PDF text is positioned, not flowed, so kerning splits words
 * mid-token — the real file contains "Educa tion" and "Univ ersit y". Never
 * compare raw; always normalise with `normalizeForMatch`.
 */
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

/** Inflate every Flate-encoded content stream and concatenate the results. */
function inflateStreams(buffer) {
  const raw = buffer.toString('latin1');
  const re = /stream\r?\n/g;
  let out = '';
  let match;
  while ((match = re.exec(raw)) !== null) {
    const start = match.index + match[0].length;
    const end = raw.indexOf('endstream', start);
    if (end < 0) continue;
    try {
      out += inflateSync(buffer.subarray(start, end)).toString('latin1');
    } catch {
      // Uncompressed or unsupported filter — the text we need lives in the
      // Flate streams, so skipping is correct rather than fatal.
    }
  }
  return out;
}

/** Decode the PDF string escapes that matter for text: \( \) \\ and octal. */
function decodeEscapes(s) {
  return s
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\([()\\])/g, '$1');
}

/** Extract the visible text of a PDF as a single (loosely spaced) string. */
export function extractPdfText(path) {
  const buffer = readFileSync(path);
  const content = inflateStreams(buffer);
  const literals = content.match(/\((?:\\.|[^()\\])*\)/g) || [];
  return literals
    .map((lit) => decodeEscapes(lit.slice(1, -1)))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Collapse to comparable form: lowercase alphanumerics only.
 *
 * This is what makes the kerning artifacts harmless — "Univ ersit y of
 * Southern California" and "University of Southern California" both become
 * `universityofsoutherncalifornia`.
 */
export function normalizeForMatch(text) {
  return String(text ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** True when `needle` appears in `haystack`, ignoring spacing and punctuation. */
export function containsFact(haystack, needle) {
  const n = normalizeForMatch(needle);
  return n.length > 0 && normalizeForMatch(haystack).includes(n);
}
