/**
 * sections.test.jsx — smoke + content-binding tests for the major sections
 * (Phase 4 / T4.1).
 *
 * These render each section and assert it surfaces content from constants.ts —
 * a UI-level regression guard complementing the schema/sync tests: if a section
 * stops rendering a company / school / category, it fails here.
 */
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import Experience from '../components/Experience';
import Education from '../components/Education';
import Skills from '../components/Skills';
import Achievements from '../components/Achievements';
import About from '../components/About';
import { EXPERIENCE, EDUCATION, SKILLS, ACHIEVEMENTS, PERSONAL_INFO } from '../constants';

describe('Experience section', () => {
  it('renders every company from constants', () => {
    render(<Experience />);
    for (const e of EXPERIENCE) {
      expect(screen.getAllByText(e.company).length).toBeGreaterThan(0);
    }
  });
});

describe('Education section', () => {
  it('renders every school from constants', () => {
    render(<Education />);
    for (const ed of EDUCATION) {
      expect(screen.getAllByText(ed.school).length).toBeGreaterThan(0);
    }
  });
});

describe('Skills section', () => {
  it('renders every skill category from constants', () => {
    render(<Skills />);
    for (const group of SKILLS) {
      expect(screen.getAllByText(group.category).length).toBeGreaterThan(0);
    }
  });
});

describe('Achievements section', () => {
  it('renders every achievement title from constants', () => {
    render(<Achievements />);
    for (const a of ACHIEVEMENTS) {
      expect(screen.getAllByText(a.title).length).toBeGreaterThan(0);
    }
  });
});

describe('About section', () => {
  it('renders within an #about landmark and reflects personal info', () => {
    const { container } = render(<About />);
    const section = container.querySelector('#about');
    expect(section).toBeTruthy();
    // The "Now" snapshot text from constants should be present somewhere.
    expect(within(section).getAllByText(/USC/i).length).toBeGreaterThan(0);
    expect(PERSONAL_INFO.bioStory.length).toBeGreaterThan(0);
  });
});
