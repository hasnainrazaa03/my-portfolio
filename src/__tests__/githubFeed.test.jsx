/**
 * githubFeed.test.jsx — the activity feed shows real commits.
 *
 * The events feed rendered "Pushed 1 commits · No message" once GitHub
 * dropped messages from public event payloads. The feed now reads the
 * commits the proxy returns; the events are a fallback only, and never
 * claim words they do not have.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import GitHubFeed from '../components/GitHubFeed';
import { toFeedItems, timeAgo } from '../utils/githubFeed';

const NOW = Date.parse('2026-09-15T12:00:00Z');
const ago = (h) => new Date(NOW - h * 3600_000).toISOString();

const recent = {
  ok: true,
  repos: [
    { name: 'my-portfolio', url: 'u', commits: [
      { at: ago(1), message: 'feat(hero): fit the experiment in one viewport', sha: 'abcdef1234567', url: 'https://github.com/x/my-portfolio/commit/abcdef1' },
      { at: ago(30), message: 'fix(bundle): move the diagrams', sha: 'bbbbbbb', url: 'https://github.com/x/my-portfolio/commit/bbbbbbb' },
    ] },
    { name: 'HireCraft', url: 'u', commits: [{ at: ago(5), message: 'chore: bump deps', sha: 'ccccccc', url: 'https://github.com/x/HireCraft/commit/ccccccc' }] },
  ],
};
const events = [{ id: 'e1', type: 'PushEvent', created_at: ago(2), repo: { name: 'hasnainrazaa03/my-portfolio' }, payload: { ref: 'refs/heads/main' } }];

describe('toFeedItems', () => {
  it('flattens commits across repositories, newest first', () => {
    const items = toFeedItems(recent, events);
    expect(items.map((i) => i.title)).toEqual([
      'feat(hero): fit the experiment in one viewport',
      'chore: bump deps',
      'fix(bundle): move the diagrams',
    ]);
    expect(items[0]).toMatchObject({ repo: 'my-portfolio', detail: 'abcdef1', href: 'https://github.com/x/my-portfolio/commit/abcdef1' });
  });

  it('falls back to events without inventing a message or a count', () => {
    const items = toFeedItems({ ok: false }, events);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Pushed to main');
    expect(items[0].repo).toBe('my-portfolio');
    expect(JSON.stringify(items)).not.toMatch(/No message|1 commits/);
  });

  it('caps the list', () => {
    const many = { ok: true, repos: [{ name: 'r', url: 'u', commits: Array.from({ length: 30 }, (_, i) => ({ at: ago(i), message: `c${i}`, sha: `s${i}`, url: 'u' })) }] };
    expect(toFeedItems(many, [])).toHaveLength(12);
  });
});

describe('timeAgo', () => {
  it('reads naturally', () => {
    expect(timeAgo(ago(0.5), NOW)).toBe('30m ago');
    expect(timeAgo(ago(3), NOW)).toBe('3h ago');
    expect(timeAgo(ago(50), NOW)).toBe('2d ago');
    expect(timeAgo(new Date(NOW - 5000).toISOString(), NOW)).toBe('just now');
  });
});

describe('<GitHubFeed />', () => {
  let observe;
  beforeEach(() => {
    // Fire "in view" immediately so the feed fetches on mount.
    globalThis.IntersectionObserver = class {
      constructor(cb) { observe = () => cb([{ isIntersecting: true }]); }
      observe() { observe(); }
      disconnect() {}
    };
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders commit messages from the proxy', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ events, recent })));
    render(<GitHubFeed />);
    expect(await screen.findByText('feat(hero): fit the experiment in one viewport')).toBeInTheDocument();
    expect(screen.getByText('Recent Commits')).toBeInTheDocument();
    expect(screen.getAllByText('my-portfolio').length).toBeGreaterThan(0);
    expect(screen.queryByText(/No message/)).toBeNull();
  });

  it('says so when a month is quiet, rather than showing nothing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ events: [], recent: { ok: true, repos: [] } })));
    render(<GitHubFeed />);
    await waitFor(() => expect(screen.getByText(/No public commits in the last 30 days/)).toBeInTheDocument());
  });
});
