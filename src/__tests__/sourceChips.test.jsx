/**
 * sourceChips.test.jsx — the "Read more" chips under a chat answer.
 *
 * These move both focus and the page, so they are real <button>s and have to
 * behave like it. The accessible-name assertion guards WCAG 2.5.3: the name
 * must CONTAIN the visible label, not replace it — the mistake made earlier on
 * ProjectCard, where an aria-label overwrote the card's own visible text.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatMessages from '../components/chat/ChatMessages';

const withSources = [
  {
    role: 'assistant',
    content: 'I built Project Vimaan.',
    sources: [
      { id: 'projects', label: 'Projects' },
      { id: 'skills', label: 'Skills' },
    ],
  },
];

describe('source chips', () => {
  it('renders a chip per cited section', () => {
    render(<ChatMessages messages={withSources} isTyping={false} />);
    expect(screen.getByRole('button', { name: /Projects/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Skills/ })).toBeInTheDocument();
  });

  it('calls onNavigate with the section id', async () => {
    const onNavigate = vi.fn();
    render(<ChatMessages messages={withSources} isTyping={false} onNavigate={onNavigate} />);
    await userEvent.click(screen.getByRole('button', { name: /Projects/ }));
    expect(onNavigate).toHaveBeenCalledWith('projects');
  });

  it('is operable from the keyboard', async () => {
    const onNavigate = vi.fn();
    render(<ChatMessages messages={withSources} isTyping={false} onNavigate={onNavigate} />);
    const chip = screen.getByRole('button', { name: /Skills/ });
    chip.focus();
    expect(chip).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onNavigate).toHaveBeenCalledWith('skills');
  });

  it('keeps the visible label inside the accessible name (WCAG 2.5.3)', () => {
    render(<ChatMessages messages={withSources} isTyping={false} />);
    const chip = screen.getByRole('button', { name: /Projects/ });
    // Visible text is "Projects"; the name extends it rather than replacing it.
    expect(chip).toHaveAccessibleName(/Projects.*jump to the Projects section/);
  });

  it('groups the chips under a labelled group', () => {
    render(<ChatMessages messages={withSources} isTyping={false} />);
    expect(screen.getByRole('group', { name: /read more/i })).toBeInTheDocument();
  });

  it('renders nothing when the answer cited no sections', () => {
    render(
      <ChatMessages
        messages={[{ role: 'assistant', content: 'Hey there!' }]}
        isTyping={false}
      />,
    );
    expect(screen.queryByRole('group', { name: /read more/i })).not.toBeInTheDocument();
  });

  it('renders nothing for an empty sources array', () => {
    render(
      <ChatMessages
        messages={[{ role: 'assistant', content: 'Hi.', sources: [] }]}
        isTyping={false}
      />,
    );
    expect(screen.queryByRole('button', { name: /jump to/i })).not.toBeInTheDocument();
  });

  it('never renders chips on a user turn', () => {
    render(
      <ChatMessages
        messages={[{ role: 'user', content: 'tell me about projects', sources: [{ id: 'projects', label: 'Projects' }] }]}
        isTyping={false}
      />,
    );
    expect(screen.queryByRole('button', { name: /jump to/i })).not.toBeInTheDocument();
  });

  it('does not throw when onNavigate is omitted', async () => {
    render(<ChatMessages messages={withSources} isTyping={false} />);
    await expect(
      userEvent.click(screen.getByRole('button', { name: /Projects/ })),
    ).resolves.not.toThrow();
  });
});
