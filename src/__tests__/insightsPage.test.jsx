/**
 * insightsPage.test.jsx — the private insights page.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import InsightsPage from '../components/InsightsPage';
import { dailyCounts, hourlyCounts, niceCeiling } from '../utils/insightsView';
import { routeHeads } from '../utils/routeMeta';
import { renderRouteHead } from '../../scripts/routeHeads.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const INSIGHTS = {
  rows: 3,
  from: '2026-09-12T16:00:00Z',
  to: '2026-09-14T16:30:00Z',
  totals: { questions: 3, conversations: 2, medianPerConversation: 1.5, offTopic: 1, possibleGaps: 1 },
  timestamps: ['2026-09-14T16:30:00Z', '2026-09-14T16:00:00Z', '2026-09-12T16:00:00Z'],
  topics: [{ id: 'projects', label: 'Projects', count: 2 }],
  mentions: [{ label: 'Project Vimaan', count: 2 }],
  possibleGaps: [{ question: 'What was your thesis grade?', at: '2026-09-14T16:30:00Z' }],
  offTopic: [{ question: 'Weather in LA?', at: '2026-09-12T16:00:00Z' }],
  recent: [{ question: 'Tell me about Vimaan', at: '2026-09-14T16:00:00Z', topics: ['Projects'] }],
};

const respond = (status, body) =>
  vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });

beforeEach(() => sessionStorage.clear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const signIn = (token = 'secret') => {
  fireEvent.change(screen.getByLabelText(/analytics token/i), { target: { value: token } });
  fireEvent.click(screen.getByRole('button', { name: /view insights/i }));
};

describe('InsightsPage', () => {
  it('shows nothing but a token form until a token is accepted', () => {
    vi.stubGlobal('fetch', respond(200, { insights: INSIGHTS }));
    render(<InsightsPage />);
    expect(screen.getByLabelText(/analytics token/i)).toHaveAttribute('type', 'password');
    expect(screen.queryByText('Tell me about Vimaan')).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends the token as a bearer header and renders the insights', async () => {
    vi.stubGlobal('fetch', respond(200, { insights: INSIGHTS }));
    render(<InsightsPage />);
    signIn('secret');
    expect(await screen.findByText('Tell me about Vimaan')).toBeInTheDocument();
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer secret');
    expect(screen.getByText('Questions per conversation').nextSibling).toHaveTextContent('1.5');
    expect(screen.getByText('What was your thesis grade?')).toBeInTheDocument();
    expect(screen.getByText('Weather in LA?')).toBeInTheDocument();
  });

  it('keeps the token for this tab only, and loads straight away on return', async () => {
    vi.stubGlobal('fetch', respond(200, { insights: INSIGHTS }));
    render(<InsightsPage />);
    signIn('secret');
    await screen.findByText('Tell me about Vimaan');
    expect(sessionStorage.getItem('insights:token')).toBe('secret');
    expect(localStorage.getItem('insights:token')).toBeNull();

    cleanup();
    render(<InsightsPage />);
    expect(await screen.findByText('Tell me about Vimaan')).toBeInTheDocument();
  });

  it('forgets a rejected token and says so', async () => {
    sessionStorage.setItem('insights:token', 'stale');
    vi.stubGlobal('fetch', respond(401, { error: 'Unauthorized' }));
    render(<InsightsPage />);
    expect(await screen.findByText(/that token was not accepted/i)).toBeInTheDocument();
    expect(sessionStorage.getItem('insights:token')).toBeNull();
    expect(screen.getByLabelText(/analytics token/i)).toBeInTheDocument();
  });

  it('reports rate limiting without discarding the token', async () => {
    sessionStorage.setItem('insights:token', 'good');
    vi.stubGlobal('fetch', respond(429, {}));
    render(<InsightsPage />);
    expect(await screen.findByText(/too many attempts/i)).toBeInTheDocument();
    expect(sessionStorage.getItem('insights:token')).toBe('good');
  });

  it('offers every chart as a table, so no number depends on hovering', async () => {
    vi.stubGlobal('fetch', respond(200, { insights: INSIGHTS }));
    render(<InsightsPage />);
    signIn();
    await screen.findByText('Tell me about Vimaan');
    expect(screen.queryAllByRole('table')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: /view as tables/i }));
    expect(screen.getAllByRole('table').length).toBe(4);
    const topics = screen.getByRole('table', { name: /by topic/i });
    expect(within(topics).getByText('Projects')).toBeInTheDocument();
  });

  it('signs out', async () => {
    vi.stubGlobal('fetch', respond(200, { insights: INSIGHTS }));
    render(<InsightsPage />);
    signIn();
    await screen.findByText('Tell me about Vimaan');
    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(sessionStorage.getItem('insights:token')).toBeNull();
    expect(screen.queryByText('Tell me about Vimaan')).not.toBeInTheDocument();
  });

  it('shows an empty state when nothing has been recorded', async () => {
    vi.stubGlobal('fetch', respond(200, { insights: { ...INSIGHTS, rows: 0, totals: { ...INSIGHTS.totals, questions: 0 }, timestamps: [] } }));
    render(<InsightsPage />);
    signIn();
    expect(await screen.findByText(/no questions recorded yet/i)).toBeInTheDocument();
  });
});

describe('local-time bucketing', () => {
  it('counts per local day across the window, zeros included, oldest first', () => {
    const now = new Date(2026, 8, 14, 18, 0);
    const days = dailyCounts([new Date(2026, 8, 14, 9).toISOString(), new Date(2026, 8, 14, 1).toISOString(), new Date(2026, 8, 12, 23).toISOString()], now, 3);
    expect(days.map((d) => d.count)).toEqual([1, 0, 2]);
  });

  it('buckets hours in the viewer\'s clock, not UTC', () => {
    // The old viewer used the server's getHours(), which on Vercel is UTC.
    const local9am = new Date(2026, 8, 14, 9, 30).toISOString();
    expect(hourlyCounts([local9am])[9].count).toBe(1);
    expect(hourlyCounts([local9am]).reduce((n, h) => n + h.count, 0)).toBe(1);
  });

  it('rounds axis ceilings to clean numbers', () => {
    expect([niceCeiling(0), niceCeiling(3), niceCeiling(7), niceCeiling(12), niceCeiling(51)]).toEqual([1, 5, 10, 20, 100]);
  });
});

describe('keeping it private', () => {
  it('is noindex, with no canonical, and not in the sitemap', () => {
    const route = routeHeads().find((r) => r.path === '/insights');
    expect(route.noindex).toBe(true);
    const html = renderRouteHead(readFileSync(resolve(process.cwd(), 'index.html'), 'utf8'), route, { origin: 'https://x' });
    expect(html).toContain('<meta name="robots" content="noindex" />');
    expect(html).not.toContain('rel="canonical"');
    expect(readFileSync(resolve(process.cwd(), 'public/sitemap.xml'), 'utf8')).not.toContain('/insights');
  });

  it('the API selects only the columns it needs and rate limits reads', () => {
    const api = readFileSync(resolve(process.cwd(), 'api/analytics.ts'), 'utf8');
    expect(api).toMatch(/\.select\('question, response, session_id, timestamp'\)/);
    expect(api).not.toMatch(/\.select\('\*'\)/);
    expect(api).toMatch(/readLimiter\(getClientIp\(req\)\)/);
    expect(api).toMatch(/insights: buildInsights\(/);
    expect(api).not.toMatch(/\n\s+data,\n/);
  });
});
