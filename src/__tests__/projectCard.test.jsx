/**
 * projectCard.test.jsx — the card must be operable by keyboard.
 *
 * REGRESSION GUARD: the cards were `motion.div`s with an `onClick`. Measured in
 * a real browser, the Projects section exposed 7 focusable elements — 4 filter
 * buttons and 3 pagination dots — and 0 of 3 cards. The entire project
 * catalogue, the thing a recruiter most wants to open, was unreachable by
 * keyboard and announced as nothing by a screen reader.
 *
 * Using a real <button> (rather than div + role + tabIndex + onKeyDown) means
 * Enter/Space, focus and the role come from the platform.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectCard from '../components/ProjectCard';

const project = {
  id: 1,
  title: 'Project Vimaan',
  category: 'AI/ML',
  status: 'In Progress',
  description: 'An NLU-driven voice command co-pilot.',
  longDescription: 'Longer copy.',
  images: ['/Xplane.jpg'],
  techStack: ['Python', 'PyTorch', 'Hugging Face Transformers', 'DistilBERT', 'Pegasus'],
  links: { github: null, demo: null },
};

describe('ProjectCard keyboard operability', () => {
  it('is a real button, not a clickable div', () => {
    render(<ProjectCard project={project} onClick={() => {}} />);
    expect(screen.getByRole('button', { name: /Project Vimaan/i }).tagName).toBe('BUTTON');
  });

  it('is reachable by Tab', async () => {
    const user = userEvent.setup();
    render(<ProjectCard project={project} onClick={() => {}} />);
    await user.tab();
    expect(screen.getByRole('button', { name: /Project Vimaan/i })).toHaveFocus();
  });

  it('opens on Enter', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ProjectCard project={project} onClick={onClick} />);
    await user.tab();
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledWith(project);
  });

  it('opens on Space', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ProjectCard project={project} onClick={onClick} />);
    await user.tab();
    await user.keyboard(' ');
    expect(onClick).toHaveBeenCalledWith(project);
  });

  it('announces the project, its category and status, and what activating does', () => {
    render(<ProjectCard project={project} onClick={() => {}} />);
    const label = screen.getByRole('button').getAttribute('aria-label');
    expect(label).toContain('Project Vimaan');
    expect(label).toContain('AI/ML');
    expect(label).toContain('In Progress');
    expect(label).toMatch(/details/i);
  });

  it('does not nest interactive elements inside the card button', () => {
    // A button inside a button is invalid HTML and breaks keyboard semantics.
    const { container } = render(<ProjectCard project={project} onClick={() => {}} />);
    const card = container.querySelector('button');
    expect(card.querySelectorAll('button, a[href], input, select, textarea')).toHaveLength(0);
  });
});

describe('ProjectCard tech stack', () => {
  it('shows the first three and counts the remainder', () => {
    render(<ProjectCard project={project} onClick={() => {}} />);
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('Hugging Face Transformers')).toBeInTheDocument();
    // 5 total, 3 shown — the other 2 were previously dropped with no trace.
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  it('omits the counter when nothing is truncated', () => {
    render(
      <ProjectCard project={{ ...project, techStack: ['React', 'Vite'] }} onClick={() => {}} />,
    );
    expect(screen.queryByText(/more$/)).not.toBeInTheDocument();
  });
});
