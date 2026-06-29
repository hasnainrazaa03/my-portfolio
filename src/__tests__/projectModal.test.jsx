import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProjectModal from '../components/ProjectModal';

const sampleProject = {
  title: 'Test Project',
  description: 'A short description.',
  longDescription: 'A longer description for the modal body.',
  tech: ['React', 'Python'],
  images: ['/sample-1.png', '/sample-2.png'],
  githubLink: 'https://github.com/example/test',
  liveLink: 'https://example.com',
  category: 'Web',
};

describe('ProjectModal', () => {
  it('renders nothing when project is null', () => {
    const { container } = render(<ProjectModal project={null} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the project title and is a real dialog', () => {
    render(<ProjectModal project={sampleProject} onClose={() => {}} />);
    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<ProjectModal project={sampleProject} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('advances images with ArrowRight when there are multiple images', () => {
    render(<ProjectModal project={sampleProject} onClose={() => {}} />);
    // First image should be visible initially.
    const initialImg = screen.getAllByRole('img').find((img) => img.getAttribute('src')?.includes('sample-1'));
    expect(initialImg).toBeTruthy();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    const nextImg = screen.getAllByRole('img').find((img) => img.getAttribute('src')?.includes('sample-2'));
    expect(nextImg).toBeTruthy();
  });
});
