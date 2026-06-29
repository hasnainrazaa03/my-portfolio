/**
 * contentSync.test.js — keeps the offline knowledge (jarvisQnA.json) and the
 * local fallback (getLocalResponse) in sync with the canonical content.
 *
 * The chat works offline-first: jarvisQnA.json (curated pairs) + getLocalResponse
 * (keyword fallback) answer when the LLM is unreachable. If you add a project or
 * rename a company in constants.js but forget to cover it here, the offline path
 * goes stale silently. These tests convert that drift into a failing build.
 *
 * Projects are keyed by a curated short keyword (full titles are long, but the
 * Q&A naturally uses short names like "BraTS" / "store separation"). Adding a
 * project to constants.js forces a new entry in PROJECT_QNA_KEYWORDS below,
 * which in turn forces real Q&A coverage.
 */
import { describe, it, expect } from 'vitest';
import qna from '../data/jarvisQnA.json';
import { EXPERIENCE, PROJECTS, EDUCATION } from '../constants';
import { getLocalResponse } from '../services/chatService';

const QNA_BLOB = JSON.stringify(qna.qaData).toLowerCase();

// Curated, stable keyword per project id. Each MUST appear in jarvisQnA.json.
// When you add a project, add its id + a short keyword here (and a Q&A pair).
const PROJECT_QNA_KEYWORDS = {
  1: 'vimaan',
  2: 'store separation',
  3: 'manzil',
  4: 'usc ledger',
  5: 'naca',
  6: 'brats',
  7: 'rvsat',
  8: 'resolv',
};

describe('contentSync — jarvisQnA covers all content', () => {
  it('has a keyword mapping for every project in constants.js', () => {
    // Forces this file to be updated whenever a project is added.
    for (const p of PROJECTS) {
      expect(PROJECT_QNA_KEYWORDS[p.id], `add a PROJECT_QNA_KEYWORDS entry for project id ${p.id} (${p.title})`).toBeTruthy();
    }
  });

  it('mentions every project (via its curated keyword)', () => {
    for (const p of PROJECTS) {
      const kw = PROJECT_QNA_KEYWORDS[p.id];
      expect(QNA_BLOB, `jarvisQnA.json never mentions "${kw}" for project: ${p.title}`).toContain(kw);
    }
  });

  it('mentions every company (by name or acronym)', () => {
    for (const e of EXPERIENCE) {
      const candidates = companyCandidates(e.company);
      const hit = candidates.some((c) => QNA_BLOB.includes(c));
      expect(hit, `jarvisQnA.json never mentions ${e.company} (tried: ${candidates.join(', ')})`).toBe(true);
    }
  });
});

describe('contentSync — getLocalResponse stays data-driven', () => {
  it('names a real current company when asked about experience', () => {
    const reply = getLocalResponse('tell me about your work experience').toLowerCase();
    const hit = EXPERIENCE.some((e) => reply.includes(e.company.toLowerCase()));
    expect(hit, 'fallback experience reply names no real company from constants.js').toBe(true);
  });

  it('names the real primary school when asked about education', () => {
    const reply = getLocalResponse('tell me about your education').toLowerCase();
    expect(reply).toContain(EDUCATION[0].school.toLowerCase());
  });

  it('names a real project when asked about projects', () => {
    const reply = getLocalResponse('what projects have you built?').toLowerCase();
    const hit = PROJECTS.some((p) => reply.includes(p.title.toLowerCase()));
    expect(hit, 'fallback projects reply names no real project from constants.js').toBe(true);
  });
});

/**
 * Candidate match strings for a company: the full name, any parenthetical
 * acronym, and each significant word (>3 chars, alphanumerics only). Lowercased.
 */
function companyCandidates(name) {
  const out = new Set();
  const lower = name.toLowerCase();
  out.add(lower);
  const acronym = name.match(/\(([^)]+)\)/);
  if (acronym) out.add(acronym[1].toLowerCase());
  for (const word of lower.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)) {
    if (word.length > 3) out.add(word);
  }
  return [...out];
}
