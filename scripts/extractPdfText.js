/**
 * Minimal PDF text extraction — enough to check the résumé against the site.
 *
 * WHY NOT A LIBRARY: `pdf-parse` and friends pull in a full PDF engine to do
 * what amounts to "inflate the content streams and read the string literals".
 * This file is that, in about 40 lines, with no dependency to keep current and
 * nothing new in the advisory surface the dependency gate watches.
 *
 * TWO PRODUCERS, TWO ENCODINGS. Some PDFs store text as plain `(literal)`
 * strings, which the zlib path below reads directly. LaTeX/tectonic instead
 * embeds subset fonts and writes `<hex>` strings whose codes mean nothing
 * without each font's ToUnicode CMap.
 *
 * Merging those CMaps into one table was tried and REJECTED: this document's 11
 * subsets disagree on 2 of 81 codes — `0x6A` is `3` in one font and `|` in
 * another. Silently picking one corrupts digits, which is precisely where GPAs
 * and dates live, and those are what the parity and claim-integrity tests
 * compare. Decoding correctly needs per-font tracking through the PDF object
 * graph, i.e. the PDF parser this file exists to avoid.
 *
 * So `pdftotext` (poppler) is used when available and the zlib path is the
 * fallback. Callers must treat an empty/garbled result as "cannot verify"
 * rather than "nothing to report" — `resumeParity.test.js` asserts an anchor
 * string for exactly that reason.
 *
 * NOTE ON SPACING: PDF text is positioned, not flowed, so kerning splits words
 * mid-token — the real file contains "Educa tion" and "Univ ersit y". Never
 * compare raw; always normalise with `normalizeForMatch`.
 */
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';

/** True when poppler's pdftotext is on PATH. */
export function hasPdfToText() {
  try {
    execFileSync('pdftotext', ['-v'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

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
  if (hasPdfToText()) {
    try {
      // `-` writes to stdout; `-layout` keeps columns from interleaving.
      const out = execFileSync('pdftotext', ['-layout', '-nopgbrk', path, '-'], {
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
      });
      if (out.trim()) return out.replace(/\s+/g, ' ').trim();
    } catch {
      /* fall through to the zlib path */
    }
  }

  const buffer = readFileSync(path);
  const content = inflateStreams(buffer);

  const literals = (content.match(/\((?:\\.|[^()\\])*\)/g) || [])
    .map((lit) => decodeEscapes(lit.slice(1, -1)))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return literals;
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
