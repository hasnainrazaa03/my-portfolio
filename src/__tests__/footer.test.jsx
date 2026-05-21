import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Footer from '../components/Footer.jsx';

describe('Footer', () => {
  it('renders the current-year copyright line', () => {
    render(<Footer />);
    const year = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
  });

  it('exposes a Privacy disclosure with hashed-IP language', () => {
    render(<Footer />);
    const summary = screen.getByText(/^Privacy$/i);
    expect(summary).toBeInTheDocument();
    expect(summary.tagName.toLowerCase()).toBe('summary');
    // The detailed text is inside <details> and is always in the DOM.
    expect(
      screen.getByText(/one-way hashed/i)
    ).toBeInTheDocument();
  });

  it('does not claim to use third-party trackers', () => {
    render(<Footer />);
    const matches = screen.getAllByText((_content, node) =>
      /does\s+not.*use\s+third-party\s+trackers/i.test(node?.textContent || '')
    );
    expect(matches.length).toBeGreaterThan(0);
  });
});
