/**
 * sectionHeading.test.jsx — the shared section header and its numbering motif.
 *
 * The numeric prefixes are a design motif, and they had drifted out of step
 * with document order: the GitHub section carried no number at all, so
 * "04. Flight Log" was actually the fifth thing on the page. Numbers written
 * by hand in eight files drift silently — this pins them to App.tsx's order.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import SectionHeading from '../components/ui/SectionHeading';

const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');

/** Section components in the order App.tsx renders them. */
function documentOrder() {
  const app = read('src/App.tsx');
  const names = ['About', 'Education', 'Projects', 'GitHubSection', 'Experience', 'Skills', 'Achievements', 'Contact'];
  return names
    .map((name) => ({ name, at: app.indexOf(`<${name}`) }))
    .filter((s) => s.at !== -1)
    .sort((a, b) => a.at - b.at)
    .map((s) => s.name);
}

describe('section numbering', () => {
  const order = documentOrder();

  it('renders all eight sections', () => {
    expect(order).toHaveLength(8);
  });

  it.each(order.map((name, i) => [name, i + 1]))(
    '%s is numbered %i in document order',
    (name, position) => {
      const src = read(`src/components/${name}.tsx`);
      const match = src.match(/number="(\d+)"/);
      expect(match, `${name} has no SectionHeading number`).not.toBeNull();
      expect(match[1]).toBe(String(position).padStart(2, '0'));
    },
  );

  it('leaves no hand-rolled section subtitles behind', () => {
    // Four different subtitle treatments had accumulated across the sections.
    const strays = order.filter((name) => /mt-4 text-slate-600/.test(read(`src/components/${name}.tsx`)));
    expect(strays, 'these sections still style their own subtitle').toEqual([]);
  });
});

describe('SectionHeading', () => {
  it('renders the number, title and subtitle', () => {
    render(<SectionHeading number="03" title="Featured Missions" subtitle="Some detail" />);
    const h2 = screen.getByRole('heading', { level: 2 });
    expect(h2).toHaveTextContent('03. Featured Missions');
    expect(screen.getByText('Some detail')).toBeInTheDocument();
  });

  it('omits the prefix when unnumbered', () => {
    render(<SectionHeading title="Just A Title" />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/^Just A Title$/);
  });

  it('renders an eyebrow above the title when given one', () => {
    render(<SectionHeading title="X" eyebrow={<svg data-testid="logo" />} />);
    expect(screen.getByTestId('logo')).toBeInTheDocument();
  });

  it('supports overriding the bottom gap', () => {
    const { container } = render(<SectionHeading title="X" className="mb-10" />);
    expect(container.firstChild).toHaveClass('mb-10');
  });
});
