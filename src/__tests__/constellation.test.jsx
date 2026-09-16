/**
 * constellation.test.jsx — the star map is an index of real projects.
 *
 * Every star must be a project that exists and link to its case study; every
 * edge must join two stars. A renamed project fails here instead of leaving
 * a star that opens a 404.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { STARS, EDGES, PATH_ORDER, neighboursOf } from '../lab/constellation/data';
import Constellation from '../components/lab/Constellation';
import { PROJECTS } from '../constants';
import { projectPath } from '../utils/slug';

const titles = PROJECTS.map((p) => p.title);

describe('constellation data', () => {
  it('names only projects that exist, between four and six of them', () => {
    expect(STARS.length).toBeGreaterThanOrEqual(4);
    expect(STARS.length).toBeLessThanOrEqual(6);
    for (const s of STARS) expect(titles, s.title).toContain(s.title);
  });

  it('joins stars only to other stars, never everything to everything', () => {
    const starTitles = STARS.map((s) => s.title);
    for (const e of EDGES) {
      expect(starTitles).toContain(e.a);
      expect(starTitles).toContain(e.b);
      expect(e.a).not.toBe(e.b);
      expect(e.shared.length).toBeGreaterThan(30);
    }
    const complete = (STARS.length * (STARS.length - 1)) / 2;
    expect(EDGES.length).toBeLessThan(complete / 2);
    for (const s of STARS) expect(neighboursOf(s.title).length, s.label).toBeGreaterThan(0);
  });

  it('puts every star on the phone path exactly once', () => {
    expect([...PATH_ORDER].sort()).toEqual(STARS.map((s) => s.title).sort());
  });
});

describe('<Constellation />', () => {
  it('renders every star as a link to its case study, in both layouts', () => {
    render(<Constellation />);
    for (const s of STARS) {
      const links = screen.getAllByRole('link', { name: new RegExp(`^${s.label.replace(/[.()]/g, '\\$&')}`) });
      expect(links.length).toBeGreaterThanOrEqual(1);
      for (const l of links) expect(l).toHaveAttribute('href', projectPath(s.title));
    }
  });

  it('shows a preview when a star is focused', () => {
    render(<Constellation />);
    const [link] = screen.getAllByRole('link', { name: /^Vimaan/ });
    fireEvent.focus(link);
    expect(screen.getByText(/connects to/)).toBeInTheDocument();
    expect(screen.getAllByText('View case study').length).toBeGreaterThan(0);
  });
});
