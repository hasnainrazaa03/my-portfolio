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

describe('SkillBar icon vs logo', () => {
  it('renders a logo <img> when the skill has an image', () => {
    const { container } = render(
      <SkillBar skill={{ name: 'Python', level: 'Expert', pct: 95, image: '/icons/python.svg' }} index={0} />,
    );
    expect(screen.getByAltText('Python')).toHaveAttribute('src', '/icons/python.svg');
    expect(container.querySelector('svg.lucide')).toBeNull();
  });

  it('renders a Lucide glyph when the skill has an icon key', () => {
    // Abstract concepts (Computer Vision, REST APIs, …) have no real logo.
    // These used to be Flaticon clipart; the swap removed the last external
    // image host and the attribution obligation that came with it.
    const { container } = render(
      <SkillBar skill={{ name: 'Computer Vision', level: 'Expert', pct: 88, icon: 'eye' }} index={0} />,
    );
    expect(container.querySelector('svg')).toBeInTheDocument();
    // No <img> at all — nothing to 404 or hotlink.
    expect(container.querySelector('img')).toBeNull();
  });

  it('still exposes the progressbar in the icon variant', () => {
    render(<SkillBar skill={{ name: 'REST APIs', level: 'Expert', pct: 85, icon: 'webhook' }} index={0} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', 'Expert');
  });
});
