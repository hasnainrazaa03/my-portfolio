/**
 * resumeAts.test.jsx — the plain-text résumé must survive a parser.
 *
 * An applicant tracking system reads the résumé before any person does. It
 * extracts text and guesses at structure, and the things that make the
 * designed view read well are exactly what make that guess wrong: side-by-side
 * columns that linearise out of order, hyperlinked words that hide their URL,
 * middot separators, non-standard section names.
 *
 * These assert the properties an extractor depends on, not the markup — the
 * layout may change freely, the parseability may not.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import AtsResume from '../components/resume/AtsResume';
import DesignedResume from '../components/resume/DesignedResume';
import { contactLines, bullets, RESUME_PROJECT_COUNT } from '../components/resume/resumeData';
import { viewFromSearch, searchForView } from '../components/resume/resumeView';
import { PERSONAL_INFO, EXPERIENCE, EDUCATION, PROJECTS, SKILLS } from '../constants';

afterEach(cleanup);

describe('the ATS view', () => {
  it('prints full profile URLs as text, not the words "GitHub" and "LinkedIn"', () => {
    // The designed header hyperlinks the word; an extractor takes anchor TEXT,
    // so the résumé arrived saying "GitHub" with no way to reach the profile.
    render(<AtsResume />);
    expect(screen.getByText(PERSONAL_INFO.socials.github.replace('https://', ''))).toBeInTheDocument();
    expect(screen.getByText(PERSONAL_INFO.socials.linkedin.replace('https://', ''))).toBeInTheDocument();
    expect(screen.getByText(PERSONAL_INFO.email)).toBeInTheDocument();
  });

  it('uses the section names a parser looks for', () => {
    render(<AtsResume />);
    for (const name of ['Education', 'Experience', 'Projects', 'Skills']) {
      expect(screen.getByRole('heading', { name: new RegExp(`^${name}$`, 'i'), level: 2 })).toBeInTheDocument();
    }
  });

  it('never puts a role and its employer in the same text run', () => {
    // "Role · Company" is one string to an extractor; split on the separator
    // and the role can be attributed to the wrong employer.
    render(<AtsResume />);
    for (const exp of EXPERIENCE) {
      expect(screen.getByText(exp.role)).toBeInTheDocument();
      expect(screen.getAllByText(exp.company).length).toBeGreaterThan(0);
    }
    expect(screen.queryByText(new RegExp(`${EXPERIENCE[0].role} · `))).not.toBeInTheDocument();
  });

  it('keeps every experience bullet as a real list item', () => {
    render(<AtsResume />);
    const expected = EXPERIENCE.flatMap((e) => bullets(e.description));
    expect(expected.length).toBeGreaterThan(0);
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    for (const line of expected) expect(items).toContain(line);
  });

  it('carries no images or icons for a parser to trip over', () => {
    const { container } = render(<AtsResume />);
    expect(container.querySelectorAll('img, svg')).toHaveLength(0);
  });

  it('shows the full tech stack, where the designed view truncates for looks', () => {
    // The designed view caps at 8 chips so a card does not overflow. A parser
    // matching keywords should see every one, so the ATS view lists them all.
    const long = PROJECTS.slice(0, RESUME_PROJECT_COUNT).find((p) => p.techStack.length > 8);
    expect(long, 'no project long enough to prove truncation differs').toBeTruthy();

    // Locate THIS project's block by its title — several projects list Python,
    // so matching on a tech name alone finds the wrong one.
    const blockFor = (container, startsWith) =>
      [...container.querySelectorAll('div')]
        .filter((el) => el.textContent.includes(long.title))
        .map((el) => [...el.querySelectorAll('p, div')].map((n) => n.textContent))
        .flat()
        .find((t) => t.startsWith(startsWith));

    const { container, unmount } = render(<AtsResume />);
    const line = blockFor(container, 'Technologies:');
    expect(line, 'no Technologies line for the long-stack project').toBeTruthy();
    for (const tech of long.techStack) expect(line, tech).toContain(tech);
    unmount();

    const { container: designed } = render(<DesignedResume />);
    const designedLine = blockFor(designed, 'Tech:');
    expect(designedLine).toBeTruthy();
    expect(designedLine).not.toContain(long.techStack[long.techStack.length - 1]);
  });

  it('states honours as a labelled field rather than a decorated chip', () => {
    const withHonors = EDUCATION.find((e) => e.honors);
    expect(withHonors, 'no education entry with honours').toBeTruthy();
    render(<AtsResume />);
    expect(screen.getByText(`Honors: ${withHonors.honors}`)).toBeInTheDocument();
  });
});

describe('both views agree on the facts', () => {
  const textOf = (ui) => {
    const { container, unmount } = render(ui);
    const text = container.textContent.replace(/\s+/g, ' ');
    unmount();
    return text;
  };

  it('name, every employer, every school and every skill appear in both', () => {
    const ats = textOf(<AtsResume />);
    const designed = textOf(<DesignedResume />);
    const facts = [
      PERSONAL_INFO.name,
      ...EXPERIENCE.map((e) => e.company),
      ...EDUCATION.map((e) => e.school),
      ...SKILLS.flatMap((g) => g.items.map((s) => s.name)),
    ];
    for (const fact of facts) {
      expect(ats, `ATS view is missing "${fact}"`).toContain(fact);
      expect(designed, `designed view is missing "${fact}"`).toContain(fact);
    }
  });

  it('shows the same GPA text in both, so the two cannot drift', () => {
    const ats = textOf(<AtsResume />);
    const designed = textOf(<DesignedResume />);
    for (const edu of EDUCATION) {
      if (!edu.gpa) continue;
      expect(ats).toContain(edu.gpa);
      expect(designed).toContain(edu.gpa);
    }
  });

  it('selects the same projects', () => {
    const ats = textOf(<AtsResume />);
    const designed = textOf(<DesignedResume />);
    for (const p of PROJECTS.slice(0, RESUME_PROJECT_COUNT)) {
      expect(ats).toContain(p.title);
      expect(designed).toContain(p.title);
    }
  });
});

describe('the view lives in the URL', () => {
  it('reads the view from a query string', () => {
    expect(viewFromSearch('?view=ats')).toBe('ats');
    expect(viewFromSearch('?view=designed')).toBe('designed');
    expect(viewFromSearch('')).toBe('designed');
    expect(viewFromSearch('?other=1')).toBe('designed');
    expect(viewFromSearch('?view=nonsense')).toBe('designed');
  });

  it('leaves the default URL clean', () => {
    expect(searchForView('designed')).toBe('');
    expect(searchForView('ats')).toBe('?view=ats');
  });

  it('round-trips', () => {
    for (const v of ['designed', 'ats']) expect(viewFromSearch(searchForView(v))).toBe(v);
  });
});

describe('contactLines()', () => {
  it('pairs a mailto/href with the text an extractor will read', () => {
    for (const c of contactLines()) {
      expect(c.href).toMatch(/^(mailto:|https?:\/\/)/);
      expect(c.value).not.toMatch(/^https?:\/\//); // shown short, still complete
      expect(c.value.length).toBeGreaterThan(0);
    }
  });
});
