/**
 * careerArcComponent.test.jsx — the chart as a reader and a screen reader meet it.
 *
 * Every value must be reachable without hovering: a bar's accessible name, and
 * the table view. The tooltip only adds a faster path for the pointer.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';
import CareerArc from '../components/CareerArc';
import { EXPERIENCE } from '../constants';

const NOW = new Date(2026, 8, 14);
afterEach(cleanup);

describe('CareerArc', () => {
  it('renders a legend of every field, with real totals — never NaN', () => {
    const { container } = render(<CareerArc now={NOW} />);
    const legend = screen.getByRole('list', { name: 'Fields' });
    expect(within(legend).getByText('Aerospace')).toBeInTheDocument();
    expect(within(legend).getByText('AI / ML')).toBeInTheDocument();
    expect(within(legend).getByText('Software & CS')).toBeInTheDocument();
    expect(within(legend).getByText('4 yr 1 mo')).toBeInTheDocument();
    expect(container.textContent).not.toContain('NaN');
  });

  it('gives every bar an accessible name carrying its dates', () => {
    render(<CareerArc now={NOW} />);
    for (const e of EXPERIENCE) {
      expect(screen.getByRole('button', { name: new RegExp(`^${e.company.replace(/[.()]/g, '\\$&')}, `) })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: /^Prana\.ai, Founding Engineer\. AI \/ ML\. Sep 2019 to Dec 2021/ })).toBeInTheDocument();
  });

  it('shows the same detail on keyboard focus as on hover', () => {
    render(<CareerArc now={NOW} />);
    const bar = screen.getByRole('button', { name: /^Prana\.ai/ });
    fireEvent.focus(bar);
    expect(screen.getByText('Sep 2019 – Dec 2021')).toBeInTheDocument();
    fireEvent.blur(bar);
    expect(screen.queryByText('Sep 2019 – Dec 2021')).not.toBeInTheDocument();

    fireEvent.mouseEnter(bar);
    expect(screen.getByText('Sep 2019 – Dec 2021')).toBeInTheDocument();
  });

  it('keeps a tapped tooltip open until Escape, for touch screens with no hover', () => {
    render(<CareerArc now={NOW} />);
    const bar = screen.getByRole('button', { name: /^Deloitte/ });
    fireEvent.click(bar);
    fireEvent.blur(bar); // a pinned tip survives losing focus
    expect(screen.getByText('Aug 2022 – Nov 2024')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('Aug 2022 – Nov 2024')).not.toBeInTheDocument();
  });

  it('hides the tooltip from assistive tech, since the bar name already says it all', () => {
    const { container } = render(<CareerArc now={NOW} />);
    fireEvent.focus(screen.getByRole('button', { name: /^Prana\.ai/ }));
    const tip = screen.getByText('Sep 2019 – Dec 2021').closest('[aria-hidden]');
    expect(tip).toHaveAttribute('aria-hidden', 'true');
    expect(container).toBeTruthy();
  });

  it('offers a table view with every row, and back', () => {
    render(<CareerArc now={NOW} />);
    const toggle = screen.getByRole('button', { name: 'View as table' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle);

    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(1 + EXPERIENCE.length + 2); // header + roles + two degrees
    expect(within(table).getByText('Dec 2027 (expected)')).toBeInTheDocument();
    expect(within(table).getByText('Present')).toBeInTheDocument();

    const back = screen.getByRole('button', { name: 'View as chart' });
    expect(back).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(back);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('marks projected time in the legend only when some exists', () => {
    render(<CareerArc now={NOW} />);
    expect(screen.getByText('Still to come')).toBeInTheDocument();
    cleanup();
    render(<CareerArc now={new Date(2028, 5, 1)} />);
    expect(screen.queryByText('Still to come')).not.toBeInTheDocument();
  });

  it('shortens a long organisation name to its own acronym, keeping the full name', () => {
    render(<CareerArc now={NOW} />);
    const label = screen.getByText('DRDO');
    expect(label).toHaveAttribute('title', 'Defence Research and Development Organisation (DRDO)');
  });

  it('never writes text in a series colour — colour sits on marks only', () => {
    const { container } = render(<CareerArc now={NOW} />);
    for (const el of container.querySelectorAll('p, h3, h4, th, td')) {
      expect(el.getAttribute('style') ?? '', el.textContent).not.toMatch(/color:\s*var\(--arc-/);
    }
  });
});
