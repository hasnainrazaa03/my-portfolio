/**
 * Shared input sanitizer for the chat API.
 * Exported as its own module so it is independently unit-testable.
 *
 * NOTE: This is defense-in-depth. The primary defense against prompt
 * injection is keeping user input strictly in the `user` role and
 * wrapping it in delimited blocks — see api/chat.js.
 */

export type SanitizeResult =
  | { safe: true; cleaned: string }
  | { safe: false; cleaned: string; reason: string };

const SUSPICIOUS_PATTERNS: RegExp[] = [
  /ignore\s*(all\s*)?instructions/i,
  /forget\s*(all\s*)?(system|previous)/i,
  /you\s+are\s+now/i,
  /jailbreak/i,
  /admin\s*mode/i,
  /override\s*(system|prompt)/i,
  /act\s+as\s+if/i,
  /pretend\s+you\s+are/i,
  /system\s*prompt/i,
  /instructions\s*say/i,
  /disregard\s*(all|previous)/i,
  /new\s+instructions/i,
  /reveal\s*(your|the)\s*(prompt|instructions)/i,
];

/**
 * Sanitize raw user input.
 */
export function sanitizeInput(raw: unknown): SanitizeResult {
  if (!raw || typeof raw !== 'string') {
    return { safe: false, cleaned: '', reason: 'invalid_input' };
  }

  // Unicode NFKC normalization (collapses fullwidth / lookalike chars)
  let cleaned = raw.normalize('NFKC');

  // Strip zero-width, soft hyphen and invisible control chars
  cleaned = cleaned.replace(/[\u200B-\u200F\u2028-\u202F\uFEFF\u00AD]/g, '');

  // Strip ASCII control characters (except whitespace handled below)
  // eslint-disable-next-line no-control-regex
  cleaned = cleaned.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');

  // Collapse whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  if (!cleaned) return { safe: false, cleaned: '', reason: 'invalid_input' };

  if (cleaned.length > 500) cleaned = cleaned.substring(0, 500);

  if (SUSPICIOUS_PATTERNS.some((p) => p.test(cleaned))) {
    return { safe: false, cleaned, reason: 'suspicious_pattern' };
  }

  if (/\S{100,}/.test(cleaned)) {
    return { safe: false, cleaned, reason: 'obfuscation_detected' };
  }

  return { safe: true, cleaned };
}
