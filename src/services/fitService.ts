/**
 * fitService.ts — client half of the job-description comparison.
 *
 * Unlike `chatService`, there is NO local fallback. The chat can answer from a
 * canned bank when the API is down because the questions are predictable; a
 * comparison against an arbitrary posting cannot be faked, and inventing one
 * would be worse than saying the service is unavailable.
 */

export type Verdict = 'strong' | 'partial' | 'weak';

export interface FitMatch {
  requirement: string;
  evidence: string;
  sourceId: string;
}

export interface FitGap {
  requirement: string;
  note: string;
}

export interface FitResult {
  verdict: Verdict;
  summary: string;
  matches: FitMatch[];
  gaps: FitGap[];
  talkingPoints: string[];
  requestId?: string;
}

export class FitError extends Error {
  /** True when the server said "slow down" rather than "something broke". */
  readonly rateLimited: boolean;

  constructor(message: string, rateLimited = false) {
    super(message);
    this.name = 'FitError';
    this.rateLimited = rateLimited;
  }
}

const GENERIC = 'The comparison service is unavailable right now. Please try again shortly.';

/**
 * POST the posting and return a validated result.
 *
 * The server has already dropped anything it could not attribute to a real
 * project or role, so whatever arrives here is safe to render — but the shape
 * is still checked, because a mangled response should read as an error rather
 * than as an empty assessment.
 */
export async function compareToJobDescription(jd: string, signal?: AbortSignal): Promise<FitResult> {
  let response: Response;
  try {
    response = await fetch('/api/fit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jd }),
      signal,
    });
  } catch (err) {
    // An aborted request is the user's own doing, not a failure to report.
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new FitError(GENERIC);
  }

  let data: Partial<FitResult> & { error?: string };
  try {
    data = await response.json();
  } catch {
    throw new FitError(GENERIC);
  }

  if (!response.ok) {
    // 4xx messages are written for the reader (too short, rate limited) and are
    // safe to show. 5xx bodies are deliberately generic server-side already.
    throw new FitError(data.error || GENERIC, response.status === 429);
  }

  if (!data.summary || !Array.isArray(data.matches) || !Array.isArray(data.gaps)) {
    throw new FitError(GENERIC);
  }

  return {
    verdict: data.verdict ?? 'partial',
    summary: data.summary,
    matches: data.matches,
    gaps: data.gaps,
    talkingPoints: Array.isArray(data.talkingPoints) ? data.talkingPoints : [],
    requestId: data.requestId,
  };
}

export default compareToJobDescription;
