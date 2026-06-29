/**
 * timelineItem.test.jsx — keyboard-accessible detail reveal (Phase 4 / T4.3, F-26).
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TimelineItem from '../components/TimelineItem';

const exp = {
  id: 1,
  role: 'Technology Analyst',
  company: 'Deloitte',
  period: 'Aug 2022 - Nov 2024',
  location: 'Bengaluru, India',
  logo: '/Deloitte.png',
  description: ['Built a workflow platform.', 'Improved latency 44%.'],
};

describe('TimelineItem keyboard reveal', () => {
  it('exposes the card as a focusable button with aria-expanded', () => {
    render(<TimelineItem exp={exp} index={0} />);
    const card = screen.getByRole('button', { name: /Technology Analyst at Deloitte/i });
    expect(card).toHaveAttribute('tabindex', '0');
    expect(card).toHaveAttribute('aria-expanded', 'false');
  });

  it('reveals details on focus and hides on blur', () => {
    render(<TimelineItem exp={exp} index={0} />);
    const card = screen.getByRole('button', { name: /Deloitte/i });
    fireEvent.focus(card);
    expect(card).toHaveAttribute('aria-expanded', 'true');
    fireEvent.blur(card);
    expect(card).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggles details with Enter and Space', () => {
    render(<TimelineItem exp={exp} index={0} />);
    const card = screen.getByRole('button', { name: /Deloitte/i });
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(card).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(card, { key: ' ' });
    expect(card).toHaveAttribute('aria-expanded', 'false');
  });
});
