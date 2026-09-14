import { deriveSources, type SourceLink } from './sourceLinks.js';

/**
 * insights.ts — turn raw chat analytics rows into what the owner acts on.
 *
 * The question this answers is "what should I write next?", so the output is
 * shaped around that: what visitors ask about, which work they name, when they
 * ask, and — most usefully — what the chat could not answer.
 *
 * Computed HERE, not in the browser. The previous viewer received up to 1,000
 * raw rows (replies up to 4,000 characters each, plus hashed IPs it never
 * used) and classified them with hard-coded word lists that had gone stale:
 * no PeakRoutine, no Sunbase, no USC Ledger. Aggregating server-side sends a
 * small payload, keeps hashed IPs out of the browser, redacts contact details
 * visitors typed before they leave the server, and classifies topics with the
 * same `deriveSources` the chat uses for its "Read more" chips, so the two
 * cannot disagree.
 */

export interface InsightRow {
  question: string | null;
  response: string | null;
  session_id: string | null;
  timestamp: string;
}

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
  /** ISO timestamps, newest first, so the browser can bucket in the viewer's own time zone. */
  timestamps: string[];
  topics: Array<Counted & { id: string }>;
  mentions: Counted[];
  possibleGaps: QuestionAt[];
  offTopic: QuestionAt[];
  recent: Array<QuestionAt & { topics: string[] }>;
}

const LIST_LIMIT = 20;
const RECENT_LIMIT = 25;

/**
 * Work a visitor can name. Explicit rather than derived from titles, because
 * people say "Vimaan" and "the rocket", not "Numerical Investigation of Store
 * Separation from a Rectangular Cavity". `covers` ties each entry back to the
 * content: insights.test.js fails when a project, employer or degree in
 * constants.ts has no entry — the staleness that broke the old word lists.
 */
export const MENTIONS: ReadonlyArray<{ label: string; patterns: RegExp[]; covers: string[] }> = [
  { label: 'PeakRoutine', patterns: [/\bpeak\s?routine\b/i], covers: ['PeakRoutine', 'PeakRoutine - AI Health & Wellness Platform'] },
  { label: 'Sunbase Data', patterns: [/\bsunbase\b/i, /\broof(ing)?\b/i, /\byolo\b/i], covers: ['Sunbase Data'] },
  { label: 'Deloitte', patterns: [/\bdeloitte\b/i, /\bpega\b/i, /\bservicenow\b/i], covers: ['Deloitte'] },
  { label: 'Prana.ai', patterns: [/\bprana\b/i], covers: ['Prana.ai'] },
  {
    label: 'DRDO store separation',
    patterns: [/\bdrdo\b/i, /\bstore separation\b/i, /\bweapons?[- ]bay\b/i],
    covers: ['Defence Research and Development Organisation (DRDO)', 'Numerical Investigation of Store Separation from a Rectangular Cavity'],
  },
  { label: 'Team Antariksh', patterns: [/\bantariksh\b/i], covers: ['Team Antariksh'] },
  { label: 'Project Vimaan', patterns: [/\bvimaan\b/i, /\bx-?plane\b/i, /\bco-?pilot\b/i], covers: ['Project Vimaan'] },
  { label: 'Manzil Recipe Vault', patterns: [/\bmanzil\b/i, /\brecipe\b/i], covers: ['Manzil Recipe Vault'] },
  { label: 'USC Ledger', patterns: [/\busc ledger\b/i, /\bexpense tracker\b/i, /\bledger\b/i], covers: ['USC Ledger'] },
  { label: 'NACA 4412 vortex study', patterns: [/\bnaca\b/i, /\bairfoil\b/i, /\bvortex\b/i], covers: ['Numerical Investigation of Vortex Influence on NACA 4412 Airfoil'] },
  { label: 'Brain tumor segmentation', patterns: [/\bbrats\b/i, /\bbrain tumou?r\b/i, /\bvision transformer\b/i], covers: ['Brain Tumor Segmentation (BraTS 2021 - Vision Transformer)'] },
  { label: 'RVSAT-1', patterns: [/\brvsat\b/i, /\bcubesat\b/i, /\bsatellite\b/i], covers: ['RVSAT-1 (Team Antariksh)'] },
  { label: 'ReSOLV-1', patterns: [/\bresolv\b/i, /\brocket\b/i], covers: ['ReSOLV-1 (Team Antariksh)'] },
  // "USC" must not count "USC Ledger".
  { label: 'USC', patterns: [/\busc\b(?!\s+ledger)/i, /\bsouthern california\b/i], covers: ['University of Southern California'] },
  { label: 'RVCE', patterns: [/\brvce\b/i, /\brv college\b/i], covers: ['RV College of Engineering'] },
];

/** The one redirect the system prompt prescribes for out-of-scope questions. */
const OFF_TOPIC = /outside my wheelhouse/i;

/**
 * Replies admitting the record lacks something. There is no prescribed wording
 * for this, so it is a HEURISTIC and is labelled as one where it is shown —
 * a list of candidates to read, not a verdict.
 */
const GAP_PHRASES =
  /\b(i (don't|do not) have (any |specific |more )?(details|information|data|numbers|figures)|i haven't (shared|listed|published|written)|that isn't (something )?(on|in) (my|the) (site|portfolio|record)|i can't (share|speak to|say)|not something i('ve| have) (covered|shared|written))\b/i;

/**
 * Strip contact details a visitor may have typed. Shown only to the token
 * holder, but the owner does not need a stranger's phone number to learn what
 * content to write.
 */
export function redact(text: string): string {
  return String(text ?? '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    // Up to two separators between digits: "+1 (213) 555-0199" has ") ".
    .replace(/(?:\+?\d[\s().-]{0,2}){9,}\d/g, '[phone]');
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const rank = (counts: Map<string, number>) =>
  [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

export function buildInsights(input: InsightRow[]): Insights {
  const rows = input
    .filter((r) => typeof r.question === 'string' && r.question.trim() && !Number.isNaN(Date.parse(r.timestamp)))
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));

  const topicCounts = new Map<string, { label: string; count: number }>();
  const mentionCounts = new Map<string, number>();
  const perSession = new Map<string, number>();
  const possibleGaps: QuestionAt[] = [];
  const offTopic: QuestionAt[] = [];
  const recent: Insights['recent'] = [];
  let offTopicCount = 0;
  let gapCount = 0;

  for (const row of rows) {
    const question = row.question as string;
    const response = row.response ?? '';

    const isOffTopic = OFF_TOPIC.test(response);
    // An off-topic reply is the prescribed redirect, which NAMES projects and
    // experience ("ask me about my projects or experience!"). Deriving topics
    // from it counted a question about the weather as a projects question.
    const topics: SourceLink[] = isOffTopic ? [] : deriveSources(question, response, 2);
    for (const t of topics) {
      const prev = topicCounts.get(t.id);
      topicCounts.set(t.id, { label: t.label, count: (prev?.count ?? 0) + 1 });
    }

    for (const m of MENTIONS) {
      if (m.patterns.some((p) => p.test(question))) mentionCounts.set(m.label, (mentionCounts.get(m.label) ?? 0) + 1);
    }

    // Rows written before session ids existed count as their own conversation.
    const session = row.session_id || `row:${row.timestamp}`;
    perSession.set(session, (perSession.get(session) ?? 0) + 1);

    const shown = { question: redact(question), at: row.timestamp };
    if (isOffTopic) {
      offTopicCount += 1;
      if (offTopic.length < LIST_LIMIT) offTopic.push(shown);
    } else if (GAP_PHRASES.test(response)) {
      gapCount += 1;
      if (possibleGaps.length < LIST_LIMIT) possibleGaps.push(shown);
    }
    if (recent.length < RECENT_LIMIT) recent.push({ ...shown, topics: topics.map((t) => t.label) });
  }

  return {
    rows: rows.length,
    from: rows.at(-1)?.timestamp ?? null,
    to: rows[0]?.timestamp ?? null,
    totals: {
      questions: rows.length,
      conversations: perSession.size,
      medianPerConversation: median([...perSession.values()]),
      offTopic: offTopicCount,
      possibleGaps: gapCount,
    },
    timestamps: rows.map((r) => r.timestamp),
    topics: [...topicCounts.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    mentions: rank(mentionCounts),
    possibleGaps,
    offTopic,
    recent,
  };
}
