import { PERSONAL_INFO } from '../constants';

/**
 * githubFeed.ts — what the activity feed shows, from what /api/github returns.
 * Commits (with messages) when there are any in the window; the public events
 * otherwise, worded only with what their payloads still carry.
 */

export interface RecentCommit {
  at: string;
  message: string;
  sha: string;
  url: string;
}
export interface RecentRepo {
  name: string;
  url: string;
  commits: RecentCommit[];
}
export type RecentWork = { ok: true; repos: RecentRepo[] } | { ok: false };

export interface GitHubEvent {
  id: string;
  type: string;
  created_at: string;
  repo?: { name: string } | null;
  payload?: { action?: string; ref?: string; ref_type?: string };
}

/** One row of the feed, whichever source it came from. */
export interface FeedItem {
  id: string;
  kind: 'commit' | 'pr' | 'star' | 'create' | 'other';
  title: string;
  detail: string | null;
  repo: string;
  href: string;
  at: string;
}

const USERNAME = PERSONAL_INFO.socials.github.split('/').pop() ?? '';
const MAX_ITEMS = 12;

/** Commits across repositories, newest first; falls back to events. */
export function toFeedItems(recent: RecentWork | undefined, events: GitHubEvent[]): FeedItem[] {
  const commits: FeedItem[] =
    recent && recent.ok
      ? recent.repos.flatMap((r) =>
          r.commits.map((c) => ({
            id: `c:${c.sha || c.url}`,
            kind: 'commit' as const,
            title: c.message,
            detail: c.sha ? c.sha.slice(0, 7) : null,
            repo: r.name,
            href: c.url,
            at: c.at,
          })),
        )
      : [];
  if (commits.length) {
    return commits.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, MAX_ITEMS);
  }
  return events.slice(0, MAX_ITEMS).map((e) => {
    const repo = e.repo?.name?.replace(`${USERNAME}/`, '') ?? 'repo';
    const href = `https://github.com/${e.repo?.name ?? USERNAME}`;
    const branch = e.payload?.ref?.replace('refs/heads/', '');
    switch (e.type) {
      case 'PushEvent':
        return { id: e.id, kind: 'commit', title: `Pushed to ${branch ?? 'a branch'}`, detail: null, repo, href, at: e.created_at };
      case 'PullRequestEvent':
        return { id: e.id, kind: 'pr', title: `${e.payload?.action === 'opened' ? 'Opened' : 'Merged or closed'} a pull request`, detail: null, repo, href, at: e.created_at };
      case 'WatchEvent':
        return { id: e.id, kind: 'star', title: 'Starred a repository', detail: null, repo, href, at: e.created_at };
      case 'CreateEvent':
        return { id: e.id, kind: 'create', title: `Created ${e.payload?.ref_type ?? 'something'}${branch ? ` ${branch}` : ''}`, detail: null, repo, href, at: e.created_at };
      default:
        return { id: e.id, kind: 'other', title: e.type, detail: null, repo, href, at: e.created_at };
    }
  });
}

export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - Date.parse(iso)) / 1000));
  const steps: Array<[number, string]> = [
    [31536000, 'y'],
    [2592000, 'mo'],
    [86400, 'd'],
    [3600, 'h'],
    [60, 'm'],
  ];
  for (const [size, unit] of steps) if (seconds >= size) return `${Math.floor(seconds / size)}${unit} ago`;
  return 'just now';
}
