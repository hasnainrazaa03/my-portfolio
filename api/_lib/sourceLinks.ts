/**
 * sourceLinks.ts — map a chat exchange to the on-page sections that back it.
 *
 * WHY DERIVE THIS RATHER THAN ASK THE MODEL: letting the model emit its own
 * anchors means it can invent one. A hallucinated `#publications` link is worse
 * than no link, and validating the output against an allow-list is the same
 * work as just deriving it — minus the tokens and the extra failure mode. This
 * is deterministic, free, and testable.
 *
 * Scoring favours the ANSWER over the question: what was actually said is a
 * better signal for "where can I read more" than what was asked. Someone who
 * asks "what have you built?" and gets an answer about a CFD role should be
 * pointed at Experience, not only at Projects.
 *
 * The section ids here MUST exist in the rendered page. `sourceLinks.test.js`
 * pins them against the real ids so a renamed section cannot silently produce
 * links that scroll nowhere.
 */

export interface SourceLink {
  /** DOM id of the section, e.g. `projects`. */
  id: string;
  /** Human label rendered on the chip. */
  label: string;
}

interface SectionRule extends SourceLink {
  /** Lowercased substrings that indicate this section is relevant. */
  terms: readonly string[];
}

/**
 * Ordered by specificity: narrower sections first, so a reply mentioning both
 * a named project and the word "skills" prefers the more specific one.
 */
const SECTIONS: readonly SectionRule[] = [
  {
    id: 'projects',
    label: 'Projects',
    terms: ['project', 'vimaan', 'brain tumor', 'segmentation', 'brats', 'recipe vault', 'expense tracker', 'built', 'i built'],
  },
  {
    id: 'experience',
    label: 'Experience',
    terms: ['experience', 'internship', 'intern', 'worked at', 'work at', 'deloitte', 'drdo', 'prana', 'antariksh', 'role', 'job'],
  },
  {
    id: 'education',
    label: 'Education',
    terms: ['education', 'degree', 'university', 'usc', 'rvce', 'gpa', 'master', 'msc', 'm.s.', 'bachelor', 'coursework', 'studying', 'study'],
  },
  {
    id: 'skills',
    label: 'Skills',
    terms: ['skill', 'tech stack', 'technolog', 'language', 'python', 'pytorch', 'tensorflow', 'react', 'node', 'matlab', 'c++', 'proficient'],
  },
  {
    id: 'achievements',
    label: 'Achievements',
    terms: ['achievement', 'award', 'publication', 'published', 'paper', 'certification', 'hackathon', 'won'],
  },
  {
    id: 'github',
    label: 'GitHub',
    terms: ['github', 'repository', 'repo', 'open source', 'commits', 'contribution'],
  },
  {
    id: 'contact',
    label: 'Contact',
    terms: ['contact', 'email', 'reach me', 'reach out', 'linkedin', 'hire', 'get in touch', 'available'],
  },
  {
    id: 'about',
    label: 'About',
    terms: ['about me', 'background', 'journey', 'aerospace', 'cfd', 'who i am', 'transition'],
  },
];

/** Answer text counts double — see the module header. */
const REPLY_WEIGHT = 2;
const QUESTION_WEIGHT = 1;

function scoreFor(rule: SectionRule, haystack: string): number {
  let hits = 0;
  for (const term of rule.terms) {
    if (haystack.includes(term)) hits += 1;
  }
  return hits;
}

/**
 * Derive up to `limit` sections backing this exchange.
 *
 * Returns `[]` when nothing matches — an empty result is correct and expected
 * (greetings, refusals, off-topic redirects), and the UI renders nothing rather
 * than guessing.
 */
export function deriveSources(question: string, reply: string, limit = 2): SourceLink[] {
  const q = String(question ?? '').toLowerCase();
  // Strip the "[Ask about: …]" affordance: it names other topics by design, so
  // scoring it would cite whichever sections the SUGGESTIONS mention rather
  // than the ones the answer actually drew on.
  const r = String(reply ?? '')
    .replace(/\[Ask about:[^\]]*\]/gi, '')
    .toLowerCase();

  if (!q && !r) return [];

  const scored = SECTIONS.map((rule) => ({
    rule,
    score: scoreFor(rule, r) * REPLY_WEIGHT + scoreFor(rule, q) * QUESTION_WEIGHT,
  })).filter((s) => s.score > 0);

  // Stable: equal scores keep SECTIONS order, which is specificity order.
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, Math.max(0, limit)).map(({ rule }) => ({ id: rule.id, label: rule.label }));
}

/** Exposed so tests can assert every id corresponds to a real page section. */
export const SOURCE_SECTION_IDS: readonly string[] = SECTIONS.map((s) => s.id);
