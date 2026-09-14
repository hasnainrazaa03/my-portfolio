/**
 * insightsService.ts — the private insights page's only network call.
 *
 * The response is aggregates (see api/_lib/insights.ts): no replies, no
 * session ids, nothing IP-shaped, and contact details already redacted.
 */

export interface Counted {
  label: string;
  count: number;
}

export interface QuestionAt {
  question: string;
  at: string;
}

export interface Insights {
  rows: number;
  from: string | null;
  to: string | null;
  totals: {
    questions: number;
    conversations: number;
    medianPerConversation: number;
    offTopic: number;
    possibleGaps: number;
  };
  timestamps: string[];
  topics: Array<Counted & { id: string }>;
  mentions: Counted[];
  possibleGaps: QuestionAt[];
  offTopic: QuestionAt[];
  recent: Array<QuestionAt & { topics: string[] }>;
}

export type InsightsErrorKind = 'unauthorized' | 'rate_limited' | 'unavailable';

export class InsightsError extends Error {
  readonly kind: InsightsErrorKind;

  constructor(kind: InsightsErrorKind) {
    super(
      kind === 'unauthorized'
        ? 'That token was not accepted.'
        : kind === 'rate_limited'
          ? 'Too many attempts. Try again in a few minutes.'
          : 'Insights are unavailable right now.',
    );
    this.name = 'InsightsError';
    this.kind = kind;
  }
}

export async function fetchInsights(token: string, signal?: AbortSignal): Promise<Insights> {
  let res: Response;
  try {
    res = await fetch('/api/analytics', { headers: { Authorization: `Bearer ${token}` }, signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new InsightsError('unavailable');
  }
  if (res.status === 401) throw new InsightsError('unauthorized');
  if (res.status === 429) throw new InsightsError('rate_limited');
  if (!res.ok) throw new InsightsError('unavailable');

  let body: { insights?: Insights };
  try {
    body = await res.json();
  } catch {
    throw new InsightsError('unavailable');
  }
  if (!body.insights || !body.insights.totals || !Array.isArray(body.insights.timestamps)) {
    throw new InsightsError('unavailable');
  }
  return body.insights;
}
