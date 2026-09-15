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

import { PROJECTS } from '../../src/constants.js';
import { projectPath } from '../../src/utils/slug.js';

export interface SourceLink {
  /** DOM id of the section, e.g. `projects`, or `case-study:<slug>`. */
  id: string;
  /** Human label rendered on the chip. */
  label: string;
  /**
   * Set for a case study: the page to open. A chip without one scrolls to the
   * section named by `id`.
   */
  href?: string;
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
  // "USC Ledger" is a project name, not a mention of the university: in
  // production a reply about this week's commits cited Education because of it.
  const q = String(question ?? '').toLowerCase().replace(/\busc ledger\b/g, 'ledger');
  // Strip the "[Ask about: …]" affordance: it names other topics by design, so
  // scoring it would cite whichever sections the SUGGESTIONS mention rather
  // than the ones the answer actually drew on.
  const r = String(reply ?? '')
    .replace(/\[Ask about:[^\]]*\]/gi, '')
    .toLowerCase()
    .replace(/\busc ledger\b/g, 'ledger');

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

/**
 * Case studies a reply names, by the names people actually use for them.
 *
 * Keyed by the project's exact title so a renamed project fails the test that
 * resolves every entry, instead of producing a link to a slug that no longer
 * exists. Patterns are specific on purpose: a bare "orbit" would match every
 * CubeSat answer, so Orbit is matched only as "Orbit Expense Tracker" or "Orbit app".
 */
const CASE_STUDY_NAMES: readonly { title: string; label: string; patterns: readonly RegExp[] }[] = [
  { title: 'Project Vimaan', label: 'Vimaan', patterns: [/\bvimaan\b/] },
  { title: 'PeakRoutine - AI Health & Wellness Platform', label: 'PeakRoutine', patterns: [/\bpeak\s?routine\b/] },
  {
    title: 'Brain Tumor Segmentation (BraTS 2021 - Vision Transformer)',
    label: 'BraTS segmentation',
    patterns: [/\bbrats\b/, /\bbrain tumou?r segmentation\b/],
  },
  { title: 'RVSAT-1 (Team Antariksh)', label: 'RVSAT-1', patterns: [/\brvsat\b/, /\bcubesat\b/] },
  { title: 'ReSOLV-1 (Team Antariksh)', label: 'ReSOLV-1', patterns: [/\bresolv\b/, /\bsounding rockets?\b/] },
  { title: 'Manzil Recipe Vault', label: 'Manzil Recipe Vault', patterns: [/\bmanzil\b/, /\brecipe vault\b/] },
  {
    title: 'Orbit Expense Tracker',
    label: 'Orbit',
    // Its old name still reaches the right page.
    patterns: [/\borbit expense tracker\b/, /\borbit app\b/, /\busc ledger\b/, /\bexpense tracker\b/],
  },
  {
    title: 'Numerical Investigation of Store Separation from a Rectangular Cavity',
    label: 'Store separation',
    patterns: [/\bstore separation\b/, /\bweapons?[- ]bay\b/],
  },
  {
    title: 'Numerical Investigation of Vortex Influence on NACA 4412 Airfoil',
    label: 'NACA 4412 study',
    patterns: [/\bnaca\s?4412\b/, /\bvortex influence\b/],
  },
];

/** Exposed so tests can check every entry resolves and every project has one. */
export const CASE_STUDY_TITLES: readonly string[] = CASE_STUDY_NAMES.map((c) => c.title);

/**
 * Case-study pages for the projects this exchange is about, strongest first.
 *
 * Same scoring as `deriveSources`: the answer counts double, and the
 * "[Ask about: …]" suggestions are ignored. A title that no longer matches a
 * project is skipped rather than linked.
 */
export function deriveCaseStudies(question: string, reply: string, limit = 1): SourceLink[] {
  const q = String(question ?? '').toLowerCase();
  const r = String(reply ?? '')
    .replace(/\[Ask about:[^\]]*\]/gi, '')
    .toLowerCase();
  const hits = (text: string, patterns: readonly RegExp[]) => patterns.filter((p) => p.test(text)).length;

  return CASE_STUDY_NAMES.map((c, order) => ({
    c,
    order,
    score: hits(r, c.patterns) * REPLY_WEIGHT + hits(q, c.patterns) * QUESTION_WEIGHT,
    project: PROJECTS.find((p) => p.title === c.title),
  }))
    .filter((x) => x.score > 0 && x.project)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, Math.max(0, limit))
    .map(({ c }) => {
      const href = projectPath(c.title);
      return { id: `case-study:${href.slice('/projects/'.length)}`, label: `${c.label} case study`, href };
    });
}

const GITHUB_SECTION: SourceLink = { id: 'github', label: 'GitHub' };

/**
 * Everything the chat shows under one answer: a case study when a project is
 * named, then the sections, at most three chips. When the answer drew on live
 * GitHub data the GitHub section comes first, because that is where the same
 * activity is shown on the page; a project the summary merely passes through
 * should not outrank it.
 */
export function deriveChatLinks(question: string, reply: string, { live = false } = {}): SourceLink[] {
  const cases = deriveCaseStudies(question, reply, 1);
  const sections = deriveSources(question, reply, 3);
  const ordered = live ? [GITHUB_SECTION, ...cases, ...sections] : [...cases, ...sections];
  const seen = new Set<string>();
  return ordered.filter((l) => !seen.has(l.id) && seen.add(l.id)).slice(0, 3);
}
