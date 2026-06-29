import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Contact from '../components/Contact';

// Mock emailjs so the test never hits the network.
vi.mock('@emailjs/browser', () => ({
  default: {
    send: vi.fn(() => Promise.resolve({ status: 200, text: 'OK' })),
  },
}));

describe('Contact form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the three labeled fields and associates them with inputs', () => {
    render(<Contact />);
    // jsx-a11y/label-has-associated-control enforces this at lint time;
    // assert it at runtime too so future refactors don't silently regress.
    expect(screen.getByLabelText(/^Name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Message$/i)).toBeInTheDocument();
  });

  it('renders a copy-email control', () => {
    render(<Contact />);
    expect(
      screen.getByLabelText(/copy email/i)
    ).toBeInTheDocument();
  });

  it('exposes a Send button', () => {
    render(<Contact />);
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });
});
