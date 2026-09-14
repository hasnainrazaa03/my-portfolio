/**
 * jobDescription.ts — recognise a pasted job posting in the chat, and hand it
 * to the comparison page intact.
 *
 * WHY THE CHAT MUST NOT ANSWER ONE ITSELF. A recruiter pasting a posting into
 * the chat got the worst of every stage: the single-line field collapsed its
 * bullet list into one run-on line, the server cut it to 500 characters, a
 * posting for an AI role that mentions "system prompt" could trip the
 * prompt-injection warning, and the first 500 characters were written to the
 * analytics table as though they were a question. /fit reads the whole thing
 * and says what the record does and does not support — the answer they were
 * actually after.
 *
 * DETECTION IS CONSERVATIVE. A false positive hijacks a real question, which is
 * worse than a missed posting (that one still gets an ordinary reply). So it
 * needs length AND several independent signals of a posting, never one.
 */

/** Postings are long. A 300-character question is not a job description. */
export const MIN_POSTING_CHARS = 300;

/** Independent markers of a job posting. Each counts once. */
const SIGNALS: RegExp[] = [
  /\bresponsibilit(y|ies)\b|\bwhat you('ll| will) do\b|\bthe role\b/i,
  /\b(requirements|qualifications|what we('re| are) looking for|must[- ]haves?)\b/i,
  /\b\d+\s*\+?\s*(-\s*\d+\s*)?years?\b[^.\n]{0,40}\bexperience\b|\byears of experience\b/i,
  /\bwe('re| are) (looking|hiring|seeking)\b|\bjoin (our|the) team\b/i,
  /\byou will\b|\byou'll\b/i,
  /\b(bachelor'?s?|master'?s?|ph\.?d\.?|degree) (in|or)\b/i,
  /\b(nice to have|preferred qualifications|bonus points|pluses?)\b/i,
  /\b(benefits|salary|compensation|equity|401\(?k\)?|pto|equal opportunity|visa sponsorship)\b/i,
  /\babout (the )?(role|team|company|us)\b/i,
  /\b(full[- ]time|part[- ]time|contract|internship|hybrid|remote|on[- ]site)\b/i,
];

/** How many signals must fire. Three is past anything a long question hits by accident. */
export const REQUIRED_SIGNALS = 3;

export function postingSignals(text: string): number {
  const body = String(text ?? '');
  let hits = SIGNALS.filter((re) => re.test(body)).length;
  // A bulleted list of three or more lines is a signal of its own; pasted
  // postings keep their newlines when read from the clipboard.
  if ((body.match(/^\s*([-•*▪●◦]|\d+[.)])\s+\S/gm) ?? []).length >= 3) hits += 1;
  return hits;
}

export function looksLikeJobDescription(text: string): boolean {
  const body = String(text ?? '').trim();
  return body.length >= MIN_POSTING_CHARS && postingSignals(body) >= REQUIRED_SIGNALS;
}

/**
 * Questions ABOUT fit — "is he a good fit for an ML role?" — are fine for the
 * chat to answer, but they deserve a pointer to the tool that does it properly.
 */
export function asksAboutFit(text: string): boolean {
  return /\b(job description|job posting|\bjd\b|good fit|right fit|a fit for|fit for (this|the|a|my) (role|job|position)|compare (him|hasnain|you)|match(es)? (the|this|my) (role|job|position))\b/i.test(
    String(text ?? ''),
  );
}

/** Rough word count for the chat bubble that stands in for the pasted text. */
export function wordCount(text: string): number {
  return (String(text ?? '').trim().match(/\S+/g) ?? []).length;
}

export const FIT_DRAFT_KEY = 'fit:draft';

/**
 * Carry a posting to /fit. sessionStorage, not the URL: postings run to
 * thousands of characters, and a URL would also put the text in browser
 * history and server logs. Never throws — storage can be unavailable
 * (private mode, blocked site data), and then /fit simply opens empty.
 */
export function stashFitDraft(text: string): boolean {
  try {
    sessionStorage.setItem(FIT_DRAFT_KEY, text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read the carried posting WITHOUT removing it — safe to call during render.
 *
 * The first version read and removed in one step, from a useState
 * initializer. React may run a render, throw it away and run it again (it
 * does so under load while a lazy chunk resolves), and render must be free of
 * side effects for exactly that reason: the discarded attempt consumed the
 * posting and the retry found nothing. /fit opened empty for a visitor on a
 * slow device. Removal now happens in `clearFitDraft`, from an effect, after
 * the render has committed.
 */
export function peekFitDraft(): string | null {
  try {
    return sessionStorage.getItem(FIT_DRAFT_KEY);
  } catch {
    return null;
  }
}

/** Drop the carried posting once it has been shown, so a reload starts clean. */
export function clearFitDraft(): void {
  try {
    sessionStorage.removeItem(FIT_DRAFT_KEY);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}
