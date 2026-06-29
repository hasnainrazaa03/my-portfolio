/**
 * skillBar.test.jsx — a11y for skill proficiency bars (Phase 4 / T4.3, F-23).
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SkillBar from '../components/SkillBar';

describe('SkillBar a11y', () => {
  it('exposes the proficiency as a labelled progressbar', () => {
    render(<SkillBar skill={{ name: 'Python', level: 'Expert', pct: 95, image: '/x.png' }} index={0} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-label', expect.stringContaining('Python'));
    expect(bar).toHaveAttribute('aria-valuetext', 'Expert');
    // Expert => level strength 4 of 4.
    expect(bar).toHaveAttribute('aria-valuenow', '4');
    expect(bar).toHaveAttribute('aria-valuemax', '4');
  });

  it('maps Intermediate to a lower value', () => {
    render(<SkillBar skill={{ name: 'Java', level: 'Intermediate', pct: 70, image: '/x.png' }} index={0} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '3');
    expect(bar).toHaveAttribute('aria-valuetext', 'Intermediate');
  });
});
