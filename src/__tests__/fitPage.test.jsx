/**
 * fitPage.test.jsx — the comparison page and its service.
 *
 * The feature's value is that a recruiter can check it. So these assert the
 * checkable properties: gaps are rendered as prominently as matches, every
 * match carries a link to the work behind it, the page says a model wrote it,
 * and a failure says so rather than showing an empty assessment that reads
 * like "no gaps found".
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';

vi.mock('../services/fitService', async () => {
  const actual = await vi.importActual('../services/fitService');
  return { ...actual, compareToJobDescription: vi.fn() };
});

import FitPage from '../components/FitPage';
import { compareToJobDescription, FitError } from '../services/fitService';
import { PROJECTS, EXPERIENCE } from '../constants';
import { toSlug } from '../utils/slug';

const PROJECT_ID = `project:${toSlug(PROJECTS[0].title)}`;
const ROLE_ID = `role:${toSlug(EXPERIENCE[0].company)}`;
const POSTING = 'Senior Machine Learning Engineer. '.repeat(10);

const RESULT = {
  verdict: 'partial',
  summary: 'Strong on model work, no production Kubernetes.',
  matches: [
    { requirement: 'PyTorch in production', evidence: 'Built a 3D segmentation pipeline.', sourceId: PROJECT_ID },
    { requirement: 'Backend APIs', evidence: 'Shipped FastAPI services.', sourceId: ROLE_ID },
  ],
  gaps: [{ requirement: 'Kubernetes', note: 'Nothing in the record shows cluster operations.' }],
  talkingPoints: ['Ask about the ONNX parity verification.'],
};

const paste = (text = POSTING) =>
  fireEvent.change(screen.getByLabelText(/job description/i), { target: { value: text } });
const submit = () => fireEvent.click(screen.getByRole('button', { name: /^compare$/i }));

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('before a comparison', () => {
  it('says a model wrote it, and that it reports gaps', () => {
    // Presenting a generated assessment as the candidate's own claim would be
    // the dishonest version of this feature.
    render(<FitPage />);
    expect(screen.getByText(/written by a language model/i)).toBeInTheDocument();
    expect(screen.getByText(/report gaps/i)).toBeInTheDocument();
  });

  it('refuses to submit an empty or too-short posting', () => {
    render(<FitPage />);
    expect(screen.getByRole('button', { name: /^compare$/i })).toBeDisabled();
    paste('ML engineer');
    expect(screen.getByRole('button', { name: /^compare$/i })).toBeDisabled();
    expect(screen.getByText(/at least 120 characters/i)).toBeInTheDocument();
    expect(compareToJobDescription).not.toHaveBeenCalled();
  });

  it('enables submission once there is a real posting', () => {
    render(<FitPage />);
    paste();
    expect(screen.getByRole('button', { name: /^compare$/i })).toBeEnabled();
  });
});

describe('a completed comparison', () => {
  beforeEach(() => compareToJobDescription.mockResolvedValue(RESULT));

  it('shows the verdict and summary', async () => {
    render(<FitPage />);
    paste();
    submit();
    expect(await screen.findByText(/partial match/i)).toBeInTheDocument();
    expect(screen.getByText(RESULT.summary)).toBeInTheDocument();
  });

  it('links every match to the work behind it', async () => {
    render(<FitPage />);
    paste();
    submit();
    await screen.findByText(/partial match/i);

    const supported = screen.getByRole('heading', { name: /what the record supports/i }).parentElement;
    const link = within(supported).getByRole('link', { name: PROJECTS[0].title });
    expect(link).toHaveAttribute('href', `/projects/${toSlug(PROJECTS[0].title)}`);
    expect(within(supported).getByText('Built a 3D segmentation pipeline.')).toBeInTheDocument();
  });

  it('renders gaps as their own section, not a footnote', async () => {
    // Same heading level as the matches. A fit tool that buries its gaps is a
    // sales page, and a recruiter who notices will not trust the rest.
    render(<FitPage />);
    paste();
    submit();
    await screen.findByText(/partial match/i);

    const gaps = screen.getByRole('heading', { name: /what it doesn.t/i });
    const matches = screen.getByRole('heading', { name: /what the record supports/i });
    expect(gaps.tagName).toBe(matches.tagName);
    expect(screen.getByText('Kubernetes')).toBeInTheDocument();
    expect(screen.getByText(/nothing in the record shows cluster operations/i)).toBeInTheDocument();
  });

  it('shows a weak verdict as plainly as a strong one', async () => {
    compareToJobDescription.mockResolvedValue({
      ...RESULT,
      verdict: 'weak',
      matches: [],
      summary: 'This role is mostly outside what the record covers.',
    });
    render(<FitPage />);
    paste();
    submit();
    expect(await screen.findByText(/weak match/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /what the record supports/i })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /what it doesn.t/i })).toBeInTheDocument();
  });

  it('renders a match whose source it cannot resolve, without a link', async () => {
    // Dropping it silently would hide a disagreement between client and server.
    compareToJobDescription.mockResolvedValue({
      ...RESULT,
      matches: [{ requirement: 'X', evidence: 'Y', sourceId: 'project:unknown-to-the-client' }],
    });
    render(<FitPage />);
    paste();
    submit();
    await screen.findByText(/partial match/i);
    expect(screen.getByText('X')).toBeInTheDocument();
    // Shown as plain text — the id itself, since there is nothing to link to.
    expect(screen.getByText(/Evidence:\s*project:unknown-to-the-client/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /unknown-to-the-client/ })).not.toBeInTheDocument();
  });

  it('sends only the trimmed posting', async () => {
    render(<FitPage />);
    paste(`   ${POSTING}   `);
    submit();
    await waitFor(() => expect(compareToJobDescription).toHaveBeenCalledTimes(1));
    expect(compareToJobDescription.mock.calls[0][0]).toBe(POSTING.trim());
  });
});

describe('when it fails', () => {
  it('shows the server\'s message and no empty assessment', async () => {
    // An empty result would read as "no gaps found", which is the opposite of
    // what happened.
    compareToJobDescription.mockRejectedValue(new FitError('Too many requests. Try again in 4 minutes.', true));
    render(<FitPage />);
    paste();
    submit();
    expect(await screen.findByText(/too many requests/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /what the record supports/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /what it doesn.t/i })).not.toBeInTheDocument();
  });

  it('re-enables the button so the reader can retry', async () => {
    compareToJobDescription.mockRejectedValue(new FitError('Unavailable.'));
    render(<FitPage />);
    paste();
    submit();
    await screen.findByText('Unavailable.');
    expect(screen.getByRole('button', { name: /^compare$/i })).toBeEnabled();
  });

  it('announces status changes to a screen reader', async () => {
    compareToJobDescription.mockRejectedValue(new FitError('Unavailable.'));
    const { container } = render(<FitPage />);
    expect(container.querySelector('[role="status"][aria-live="polite"]')).toBeInTheDocument();
    paste();
    submit();
    await screen.findByText('Unavailable.');
    expect(container.querySelector('[role="status"]').textContent).toContain('Unavailable.');
  });
});
