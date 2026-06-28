/**
 * buildKnowledge.test.js — asserts the chatbot knowledge block stays in sync
 * with the canonical content in constants.js.
 *
 * The "includes every project + company" tests are the anti-drift gate: add a
 * project or rename a company in constants.js and it MUST appear in the block,
 * with zero edits to api/chat.js.
 */
import { describe, it, expect } from 'vitest';
import { buildKnowledgeBlock } from '../data/buildKnowledge.js';
import { PERSONAL_INFO, PROJECTS, EXPERIENCE, SKILLS, EDUCATION } from '../constants.js';

const liveContent = {
  personalInfo: PERSONAL_INFO,
  projects: PROJECTS,
  experience: EXPERIENCE,
  skills: SKILLS,
  education: EDUCATION,
};

describe('buildKnowledgeBlock — live content', () => {
  const block = buildKnowledgeBlock(liveContent);

  it('includes every project title from constants.js', () => {
    for (const p of PROJECTS) {
      expect(block, `missing project: ${p.title}`).toContain(p.title);
    }
  });

  it('includes every company from EXPERIENCE', () => {
    for (const e of EXPERIENCE) {
      expect(block, `missing company: ${e.company}`).toContain(e.company);
    }
  });

  it('includes every education school', () => {
    for (const ed of EDUCATION) {
      expect(block, `missing school: ${ed.school}`).toContain(ed.school);
    }
  });

  it('includes every skill category', () => {
    for (const group of SKILLS) {
      expect(block, `missing skill category: ${group.category}`).toContain(group.category);
    }
  });

  it('contains the canonical section headers', () => {
    expect(block).toContain('=== ABOUT ME ===');
    expect(block).toContain('KEY PROJECTS:');
    expect(block).toContain('WORK EXPERIENCE:');
    expect(block).toContain('SKILLS:');
    expect(block).toContain('EDUCATION:');
  });

  it('has no undefined / [object Object] leakage from a shape change', () => {
    expect(block).not.toMatch(/undefined/);
    expect(block).not.toMatch(/\[object Object\]/);
  });

  it('is deterministic across calls', () => {
    expect(buildKnowledgeBlock(liveContent)).toBe(buildKnowledgeBlock(liveContent));
  });
});

describe('buildKnowledgeBlock — picks up new content automatically', () => {
  it('surfaces a newly added project with no other changes', () => {
    const withNew = {
      ...liveContent,
      projects: [
        ...PROJECTS,
        {
          id: 999,
          title: 'Quantum Flux Capacitor',
          category: 'AI/ML',
          status: 'In Progress',
          description: 'A test project that should appear in the knowledge block.',
          longDescription: 'x',
          images: ['/x.png'],
          techStack: ['Python'],
          links: { github: null, demo: null },
        },
      ],
    };
    const block = buildKnowledgeBlock(withNew);
    expect(block).toContain('Quantum Flux Capacitor');
    expect(block).toContain('A test project that should appear in the knowledge block.');
  });

  it('surfaces a renamed company', () => {
    const renamed = {
      ...liveContent,
      experience: EXPERIENCE.map((e, i) => (i === 0 ? { ...e, company: 'Acme Robotics' } : e)),
    };
    expect(buildKnowledgeBlock(renamed)).toContain('Acme Robotics');
  });
});
