/**
 * chatFitHandoff.test.jsx — a posting pasted into the chat goes to /fit.
 *
 * Sent to /api/chat, a posting was flattened, cut to 500 characters, sometimes
 * flagged as prompt injection, and logged as a question. These pin the new
 * path end to end inside the client: nothing reaches the chat API, the
 * transcript stays readable, and /fit receives the posting intact.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('../services/chatService', () => ({ getChatResponse: vi.fn() }));
vi.mock('../services/analyticsService', () => ({
  analyticsService: { logInteraction: vi.fn(), sessionId: 's' },
}));
vi.mock('../components/ChatDemo', () => ({ default: () => null }));
vi.mock('../components/QnASearch', () => ({ default: () => null }));

import Chatbot from '../components/Chatbot';
import FitPage from '../components/FitPage';
import { getChatResponse } from '../services/chatService';
import { FIT_DRAFT_KEY } from '../utils/jobDescription';

const POSTING = `Machine Learning Engineer
About the role
We are looking for an engineer to join our team. You will build perception models.
Responsibilities:
- Train 3D segmentation models
- Build point-cloud pipelines
- Ship on-device inference
Requirements:
- 3+ years of experience with PyTorch
Full-time, hybrid. Benefits include equity.`;

const openChat = () => fireEvent.click(screen.getByRole('button', { name: /open chat/i }));
const field = () => screen.getByPlaceholderText(/ask about projects/i);
const paste = (text) =>
  fireEvent.paste(field(), { clipboardData: { getData: () => text } });

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});
afterEach(cleanup);

describe('pasting a job description into the chat', () => {
  it('never calls the chat API, and offers the comparison instead', async () => {
    render(<Chatbot />);
    openChat();
    paste(POSTING);

    const link = await screen.findByRole('link', { name: /compare this role/i });
    expect(link).toHaveAttribute('href', '/fit');
    expect(getChatResponse).not.toHaveBeenCalled();
  });

  it('shows a short stand-in rather than the pasted wall of text', async () => {
    render(<Chatbot />);
    openChat();
    paste(POSTING);
    expect(await screen.findByText(/Pasted a job description \(\d+ words\)/)).toBeInTheDocument();
    expect(screen.queryByText(/Train 3D segmentation models/)).not.toBeInTheDocument();
  });

  it('carries the posting to /fit with its newlines intact', () => {
    render(<Chatbot />);
    openChat();
    paste(POSTING);
    expect(sessionStorage.getItem(FIT_DRAFT_KEY)).toBe(POSTING);
  });

  it('also catches a posting that was typed or dropped in and submitted', async () => {
    render(<Chatbot />);
    openChat();
    fireEvent.change(field(), { target: { value: POSTING.replace(/\n/g, ' ') } });
    fireEvent.submit(field().closest('form'));
    expect(await screen.findByRole('link', { name: /compare this role/i })).toBeInTheDocument();
    expect(getChatResponse).not.toHaveBeenCalled();
  });

  it('lets an ordinary paste through untouched', () => {
    render(<Chatbot />);
    openChat();
    paste('What did you build at Deloitte?');
    expect(screen.queryByRole('link', { name: /compare this role/i })).not.toBeInTheDocument();
    expect(sessionStorage.getItem(FIT_DRAFT_KEY)).toBeNull();
  });
});

describe('asking about fit', () => {
  it('answers normally, and adds a pointer to compare a specific posting', async () => {
    getChatResponse.mockResolvedValue('I have shipped ML systems end to end.');
    render(<Chatbot />);
    openChat();
    fireEvent.change(field(), { target: { value: 'Is he a good fit for an ML role?' } });
    fireEvent.submit(field().closest('form'));

    expect(await screen.findByText('I have shipped ML systems end to end.')).toBeInTheDocument();
    expect(getChatResponse).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: /compare a specific posting/i })).toHaveAttribute('href', '/fit');
  });

  it('adds no pointer to unrelated answers', async () => {
    getChatResponse.mockResolvedValue('Vimaan is a voice co-pilot for X-Plane.');
    render(<Chatbot />);
    openChat();
    fireEvent.change(field(), { target: { value: 'Tell me about Project Vimaan' } });
    fireEvent.submit(field().closest('form'));
    await screen.findByText('Vimaan is a voice co-pilot for X-Plane.');
    expect(screen.queryByRole('link', { name: /compare/i })).not.toBeInTheDocument();
  });
});

describe('/fit receiving the posting', () => {
  it('opens pre-filled, says where it came from, and does not submit on its own', () => {
    sessionStorage.setItem(FIT_DRAFT_KEY, POSTING);
    render(<FitPage />);
    expect(screen.getByLabelText(/job description/i)).toHaveValue(POSTING);
    expect(screen.getByText(/brought over from the chat/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^compare$/i })).toBeEnabled();
    expect(sessionStorage.getItem(FIT_DRAFT_KEY)).toBeNull(); // read once
  });

  it('opens empty with no carried posting', () => {
    render(<FitPage />);
    expect(screen.getByLabelText(/job description/i)).toHaveValue('');
    expect(screen.queryByText(/brought over from the chat/i)).not.toBeInTheDocument();
  });
});
