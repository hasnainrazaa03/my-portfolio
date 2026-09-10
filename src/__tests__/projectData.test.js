/**
 * projectData.test.js — the text parser must agree with the real module.
 *
 * `scripts/projectData.js` reads `src/constants.ts` as TEXT, because the build
 * scripts run as plain Node where importing a `.ts` module means a loader flag
 * that moves between Node versions. The price of parsing rather than importing
 * is silent drift: a field renamed in constants.ts, or a title containing a
 * character the regex does not expect, and the parser quietly returns
 * something wrong — which would ship a card titled with the wrong project.
 *
 * Vitest DOES understand TypeScript, so it can hold both sides against each
 * other. That is the whole point of this file.
 */
import { describe, it, expect } from 'vitest';
import { readProjects, readPersonalName } from '../../scripts/projectData.js';
import { PROJECTS, PERSONAL_INFO } from '../constants';

const parsed = readProjects();

describe('readProjects()', () => {
  it('finds every project, in declaration order', () => {
    expect(parsed.map((p) => p.title)).toEqual(PROJECTS.map((p) => p.title));
  });

  it.each(PROJECTS.map((p, i) => [p.title, p, i]))('agrees on every field for %s', (_t, project, i) => {
    expect(parsed[i]).toEqual({
      title: project.title,
      category: project.category,
      status: project.status,
      techStack: project.techStack,
      image: project.images?.[0] ?? null,
    });
  });

  it('handles the titles with characters a naive regex would trip on', () => {
    // "PeakRoutine - AI Health & Wellness Platform" (ampersand, spaced hyphen)
    // and "Brain Tumor Segmentation (BraTS 2021 - Vision Transformer)".
    const tricky = PROJECTS.filter((p) => /[&()]/.test(p.title));
    expect(tricky.length, 'no tricky titles left to guard').toBeGreaterThan(0);
    for (const p of tricky) {
      expect(parsed.find((q) => q.title === p.title), p.title).toBeTruthy();
    }
  });

  it('reads the author name', () => {
    expect(readPersonalName()).toBe(PERSONAL_INFO.name);
  });
});
