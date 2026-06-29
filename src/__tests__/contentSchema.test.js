/**
 * contentSchema.test.js — guards the shape of all site content.
 *
 * The first test (real content parses) is the key regression gate: any future
 * malformed edit to `src/constants.js` fails CI here. The remaining tests assert
 * each schema rejects representative bad data and that errors aggregate.
 */
import { describe, it, expect } from 'vitest';
import {
  collectContentErrors,
  validateContent,
  PersonalInfoSchema,
  ProjectSchema,
  EducationSchema,
  SkillItemSchema,
  AchievementSchema,
  NowSchema,
} from '../data/contentSchema';

describe('contentSchema — real content', () => {
  it('validates the live constants.js with zero errors', () => {
    // REGRESSION GATE: if this fails, an edit to constants.js broke the schema.
    expect(collectContentErrors()).toEqual([]);
  });

  it('validateContent() does not throw for live content', () => {
    expect(() => validateContent()).not.toThrow();
  });
});

describe('contentSchema — per-schema rejections', () => {
  it('rejects a malformed email', () => {
    const r = PersonalInfoSchema.safeParse({
      name: 'X', title: 'X', tagline: 'X', bio: 'X', bioHeadline: 'X', bioStory: 'X',
      email: 'not-an-email',
      socials: { github: 'https://a.com', linkedin: 'https://a.com', instagram: 'https://a.com' },
    });
    expect(r.success).toBe(false);
  });

  it('rejects a non-url social link', () => {
    const r = PersonalInfoSchema.safeParse({
      name: 'X', title: 'X', tagline: 'X', bio: 'X', bioHeadline: 'X', bioStory: 'X',
      email: 'a@b.com',
      socials: { github: 'github.com/x', linkedin: 'https://a.com', instagram: 'https://a.com' },
    });
    expect(r.success).toBe(false);
  });

  it('rejects a project with an empty images array', () => {
    const r = ProjectSchema.safeParse({
      id: 1, title: 'T', category: 'AI/ML', status: 'Completed',
      description: 'd', longDescription: 'ld',
      images: [],
      techStack: ['Python'],
      links: { github: null, demo: null },
    });
    expect(r.success).toBe(false);
  });

  it('rejects a project with an unknown category', () => {
    const r = ProjectSchema.safeParse({
      id: 1, title: 'T', category: 'Robotics', status: 'Completed',
      description: 'd', longDescription: 'ld',
      images: ['/x.png'],
      techStack: ['Python'],
      links: { github: null, demo: null },
    });
    expect(r.success).toBe(false);
  });

  it('rejects a non-url, non-null project link', () => {
    const r = ProjectSchema.safeParse({
      id: 1, title: 'T', category: 'AI/ML', status: 'Completed',
      description: 'd', longDescription: 'ld',
      images: ['/x.png'],
      techStack: ['Python'],
      links: { github: 'not a url', demo: null },
    });
    expect(r.success).toBe(false);
  });

  it('accepts an absolute asset path but rejects a bare relative path for images', () => {
    const base = {
      id: 1, title: 'T', category: 'AI/ML', status: 'Completed',
      description: 'd', longDescription: 'ld',
      techStack: ['Python'], links: { github: null, demo: null },
    };
    expect(ProjectSchema.safeParse({ ...base, images: ['/ok.png'] }).success).toBe(true);
    expect(ProjectSchema.safeParse({ ...base, images: ['ok.png'] }).success).toBe(false);
  });

  it('accepts a CDN url for a skill image', () => {
    const r = SkillItemSchema.safeParse({
      name: 'Python', level: 'Expert', pct: 95,
      image: 'https://cdn.example.com/python.svg',
    });
    expect(r.success).toBe(true);
  });

  it('rejects a skill pct outside 0-100', () => {
    expect(SkillItemSchema.safeParse({ name: 'X', level: 'Expert', pct: 140, image: '/x.png' }).success).toBe(false);
  });

  it('rejects a bad ISO date in NOW.updated', () => {
    const r = NowSchema.safeParse({ updated: '20-05-2026', items: [{ emoji: '🎓', text: 'x' }] });
    expect(r.success).toBe(false);
  });

  it('rejects an education entry missing a url', () => {
    const r = EducationSchema.safeParse({
      id: 1, degree: 'X', school: 'X', period: 'X', gpa: 'X', coursework: 'X', image: '/x.png',
    });
    expect(r.success).toBe(false);
  });

  it('accepts a nullable achievement url', () => {
    const r = AchievementSchema.safeParse({
      category: 'Award', year: '2025', title: 'T', issuer: 'Org', detail: 'd', url: null,
    });
    expect(r.success).toBe(true);
  });
});

describe('contentSchema — aggregation', () => {
  it('aggregates multiple errors across exports instead of failing on the first', () => {
    const errors = collectContentErrors({
      PERSONAL_INFO: { email: 'bad' },          // many missing fields + bad email
      STATS: [],                                 // empty array (min 1)
      NOW: { updated: 'nope', items: [] },       // bad date + empty items
      EDUCATION: [],
      PROJECTS: [],
      ACHIEVEMENTS: [],
      SKILLS: [],
      EXPERIENCE: [],
    });
    // Expect failures reported from more than one export.
    const offendingExports = new Set(errors.map((e) => e.split('.')[0]));
    expect(errors.length).toBeGreaterThan(1);
    expect(offendingExports.size).toBeGreaterThan(1);
  });

  it('validateContent() throws with a readable aggregated message', () => {
    expect(() => validateContent({
      ...{ PERSONAL_INFO: undefined, STATS: undefined, NOW: undefined, EDUCATION: undefined,
        PROJECTS: undefined, ACHIEVEMENTS: undefined, SKILLS: undefined, EXPERIENCE: undefined },
    })).toThrow(/Invalid site content/);
  });
});
