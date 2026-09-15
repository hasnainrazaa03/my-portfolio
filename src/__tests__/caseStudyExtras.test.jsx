/**
 * caseStudyExtras.test.jsx — the "How it works" diagrams for the two public
 * web repos, and the NACA 4412 lift-curve explorer.
 *
 * The diagrams were authored from the repositories' code; these tests pin the
 * mechanisms that made those paths worth drawing, so an edit cannot quietly
 * drop the guard the figure exists to show. The explorer tests pin the one
 * property that matters most: it can never be mistaken for the study's data.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProjectDetailPage from '../components/ProjectDetailPage';
import LiftCurveExplorer from '../components/LiftCurveExplorer';
import { PROJECTS } from '../constants';
import { ARCHITECTURES } from '../data/architectures';
import { toSlug } from '../utils/slug';

const byTitle = (t) => PROJECTS.find((p) => p.title.startsWith(t));
const diagramOf = (p) => ARCHITECTURES[p.title];

describe('Manzil Recipe Vault diagram', () => {
  const project = byTitle('Manzil');

  it('screens addresses before fetching, and fetching before parsing', () => {
    const labels = diagramOf(project).lanes[0].stages.map((s) => s.label);
    const screenAt = labels.findIndex((l) => /screen addresses/i.test(l));
    const fetchAt = labels.findIndex((l) => /^fetch/i.test(l));
    const parseAt = labels.findIndex((l) => /parse/i.test(l));
    expect(screenAt).toBeGreaterThan(-1);
    expect(screenAt).toBeLessThan(fetchAt);
    expect(fetchAt).toBeLessThan(parseAt);
  });

  it('shows that the import itself saves nothing', () => {
    expect(diagramOf(project).handoffs[0]).toMatch(/nothing written/i);
  });

  it('renders on the case-study page', () => {
    render(<ProjectDetailPage slug={toSlug(project.title)} />);
    expect(screen.getByText('How it works')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Browser — review' })).toBeInTheDocument();
  });
});

describe('Orbit Expense Tracker diagram and copy', () => {
  const project = byTitle('Orbit Expense Tracker');

  it('diverts offline writes to the queue before anything is sent', () => {
    const [browser] = diagramOf(project).lanes;
    const online = browser.stages.find((s) => s.label === 'Online?');
    expect(online.exit.outcome).toMatch(/IndexedDB/);
  });

  it('ends at the replay check, then integer cents', () => {
    const api = diagramOf(project).lanes[1].stages;
    const last = api[api.length - 1];
    expect(last.exit.outcome).toMatch(/existing row/);
    expect(last.passes).toMatch(/integer cents/);
  });

  it('carries no live link while the deployment is down', () => {
    expect(project.links.demo).toBeNull();
  });
});

describe('lift-curve explorer', () => {
  it('is only on the NACA 4412 study', () => {
    const withExplorer = PROJECTS.filter((p) => p.explorer);
    expect(withExplorer.map((p) => p.title)).toEqual([expect.stringMatching(/NACA 4412/)]);
  });

  it('announces itself as a textbook model and disowns the CFD results', () => {
    render(<LiftCurveExplorer />);
    expect(screen.getByText('Textbook model')).toBeInTheDocument();
    expect(screen.getByText(/not from this project's CFD/)).toBeInTheDocument();
    expect(screen.getByText(/none of those results are plotted here/)).toBeInTheDocument();
    expect(screen.getByText('Stall region — not modelled')).toBeInTheDocument();
  });

  it('reads out both sections at the chosen angle', () => {
    render(<LiftCurveExplorer />);
    fireEvent.change(screen.getByLabelText('Angle of attack'), { target: { value: '0' } });
    const readout = screen.getByText(/the model gives/);
    // Symmetric section: no lift at zero incidence. Cambered: 2π · 4.15° ≈ 0.46.
    expect(readout.textContent).toMatch(/NACA 0012 cl = 0\.00/);
    expect(readout.textContent).toMatch(/NACA 4412 cl = 0\.46/);
  });

  it('warns in words past the stall angle', () => {
    render(<LiftCurveExplorer />);
    fireEvent.change(screen.getByLabelText('Angle of attack'), { target: { value: '14' } });
    expect(screen.getByText(/near or past stall/)).toBeInTheDocument();
  });

  it('offers every plotted number as a table', () => {
    render(<LiftCurveExplorer />);
    fireEvent.click(screen.getByRole('button', { name: 'Show as table' }));
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(1 + 13); // header + −8° to 16° in 2° steps
    expect(screen.getByRole('columnheader', { name: 'NACA 4412 cl' })).toBeInTheDocument();
  });

  it('renders on the NACA case-study page', () => {
    const naca = byTitle('Numerical Investigation of Vortex');
    render(<ProjectDetailPage slug={toSlug(naca.title)} />);
    expect(screen.getByText('The physics underneath')).toBeInTheDocument();
  });
});
