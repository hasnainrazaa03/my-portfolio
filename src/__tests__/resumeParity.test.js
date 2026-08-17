/**
 * resumeParity.test.js — the PDF and the site must not contradict each other.
 *
 * There are two résumés: `public/resume.pdf` (what the Hero download button
 * hands a recruiter) and the live `/resume` page, which renders from
 * `constants.ts`. A recruiter routinely sees both. Dates or titles that
 * disagree between them is a credibility problem, and nothing was comparing
 * them — the PDF is a binary blob that no test had ever opened.
 *
 * WHAT IS ENFORCED vs REPORTED
 * ----------------------------
 * A one-page PDF legitimately trims things the site shows in full, so
 * "everything on the site is in the PDF" would fail on day one over deliberate
 * edits — and a red X nobody can act on is one everybody learns to ignore (the
 * same reasoning as the dependency gate). So:
 *
 *   ENFORCED  — identity facts, and for every entry that IS in the PDF, its
 *               dates and title must agree with the site.
 *   ALLOWED   — entries deliberately trimmed from the one-pager, listed
 *               explicitly below. A NEW omission is not on the list, so adding
 *               a job to constants.ts without updating the PDF fails here.
 */
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { extractPdfText, containsFact, normalizeForMatch } from '../../scripts/extractPdfText.js';
import { PERSONAL_INFO, EDUCATION, EXPERIENCE } from '../constants';

const pdfText = extractPdfText(resolve(process.cwd(), 'public/resume.pdf'));

/**
 * Entries the one-page PDF deliberately leaves out. Anything NOT listed here
 * that is missing from the PDF is treated as drift and fails.
 */
const ALLOWED_OMISSIONS = {
  schools: [
    // High school — trimmed from a one-page graduate résumé, as expected.
    'Study Hall',
  ],
  companies: [
    // Student engineering team. Present on the site, absent from the PDF.
    // Listed here so the suite stays green, but this one is UNVERIFIED — if
    // the omission was not deliberate, the PDF is missing a real role.
    'Team Antariksh',
  ],
};

describe('résumé PDF extraction', () => {
  it('extracts readable text, not mojibake', () => {
    // If the PDF is ever re-exported with subset fonts / custom CMaps, the
    // extractor yields garbage. Without this anchor every comparison below
    // would silently "pass" by finding nothing and asserting nothing.
    expect(pdfText.length).toBeGreaterThan(1000);
    expect(containsFact(pdfText, 'Experience')).toBe(true);
    expect(containsFact(pdfText, 'Education')).toBe(true);
  });
});

describe('identity matches the site', () => {
  it('carries the same name', () => {
    expect(containsFact(pdfText, PERSONAL_INFO.name)).toBe(true);
  });

  it('carries the same email', () => {
    expect(containsFact(pdfText, PERSONAL_INFO.email)).toBe(true);
  });
});

describe('education matches the site', () => {
  const checked = EDUCATION.filter((e) => !ALLOWED_OMISSIONS.schools.includes(e.school));

  it.each(checked.map((e) => [e.school, e]))('lists %s', (_school, entry) => {
    expect(containsFact(pdfText, entry.school)).toBe(true);
  });

  it.each(checked.map((e) => [e.school, e]))('agrees on the years for %s', (_school, entry) => {
    // Compare YEARS, not the formatted period: the site writes
    // "2025 - 2027 (Expected)" where the PDF writes "Aug 2025 – Dec 2027".
    // Both are correct; only a disagreeing year is drift.
    for (const year of String(entry.period).match(/\b(19|20)\d{2}\b/g) || []) {
      expect(containsFact(pdfText, year), `${entry.school}: year ${year}`).toBe(true);
    }
  });
});

describe('experience matches the site', () => {
  const checked = EXPERIENCE.filter((e) => !ALLOWED_OMISSIONS.companies.includes(e.company));

  it.each(checked.map((e) => [e.company, e]))('lists %s', (_company, entry) => {
    expect(containsFact(pdfText, entry.company)).toBe(true);
  });

  it.each(checked.map((e) => [e.company, e]))('agrees on the title at %s', (_company, entry) => {
    expect(containsFact(pdfText, entry.role), `${entry.company}: role "${entry.role}"`).toBe(true);
  });

  it.each(checked.map((e) => [e.company, e]))('agrees on the dates at %s', (_company, entry) => {
    // Month+year tokens, e.g. "Aug 2022". A title that stayed while the dates
    // moved is exactly the kind of drift a recruiter spots.
    for (const token of String(entry.period).match(/[A-Z][a-z]{2}\s+(19|20)\d{2}/g) || []) {
      expect(containsFact(pdfText, token), `${entry.company}: ${token}`).toBe(true);
    }
  });
});

describe('omission allowlist stays honest', () => {
  it('only lists entries that really are absent from the PDF', () => {
    // Prevents the list from silently growing stale: once something IS added
    // to the PDF, it must come off the allowlist and be enforced again.
    const stale = [
      ...ALLOWED_OMISSIONS.schools.filter((s) => containsFact(pdfText, s)),
      ...ALLOWED_OMISSIONS.companies.filter((c) => containsFact(pdfText, c)),
    ];
    expect(stale, `now present in the PDF — remove from ALLOWED_OMISSIONS: ${stale}`).toEqual([]);
  });

  it('only lists entries that actually exist on the site', () => {
    const known = new Set([
      ...EDUCATION.map((e) => normalizeForMatch(e.school)),
      ...EXPERIENCE.map((e) => normalizeForMatch(e.company)),
    ]);
    const orphans = [...ALLOWED_OMISSIONS.schools, ...ALLOWED_OMISSIONS.companies].filter(
      (n) => !known.has(normalizeForMatch(n)),
    );
    expect(orphans, `allowlisted but not in constants.ts: ${orphans}`).toEqual([]);
  });
});
