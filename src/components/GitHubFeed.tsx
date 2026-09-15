import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitCommit, GitPullRequest, Star, GitBranch, Disc, ExternalLink, Loader2, AlertCircle, Github } from 'lucide-react';
import { toFeedItems, timeAgo, type FeedItem, type GitHubEvent, type RecentWork } from '../utils/githubFeed';
import { PERSONAL_INFO } from '../constants';

/**
 * GitHubFeed — recent commits, with their messages.
 *
 * The feed used to render GitHub's public events, and read "Pushed 1 commits
 * · No message" all the way down: GitHub stopped including commit messages
 * and pull-request titles in public event payloads. /api/github now also
 * returns `recent` — the repositories pushed in the last 30 days and their
 * commits, from the repos and commits endpoints — and that is what the feed
 * shows. The events are kept only as a fallback for a quiet month, rendered
 * without the words the payload no longer carries.
 */

const USERNAME = PERSONAL_INFO.socials.github.split('/').pop() ?? '';

const STYLE: Record<FeedItem['kind'], { icon: typeof GitCommit; colour: string; bg: string }> = {
  commit: { icon: GitCommit, colour: 'text-primary', bg: 'bg-primary/10' },
  pr: { icon: GitPullRequest, colour: 'text-purple-400', bg: 'bg-purple-400/10' },
  star: { icon: Star, colour: 'text-amber-400', bg: 'bg-amber-400/10' },
  create: { icon: GitBranch, colour: 'text-blue-400', bg: 'bg-blue-400/10' },
  other: { icon: Disc, colour: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-400/10' },
};

const ActivityItem = ({ item, index }: { item: FeedItem; index: number }) => {
  const { icon: Icon, colour, bg } = STYLE[item.kind];
  return (
    <motion.a
      href={item.href}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.06 }}
      className="flex items-start gap-3 rounded-xl border border-transparent p-3 transition-colors hover:border-slate-200 hover:bg-slate-100 dark:hover:border-white/10 dark:hover:bg-white/5 group"
    >
      <div className={`mt-0.5 shrink-0 rounded-lg p-2 ${bg} ${colour}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug text-slate-900 dark:text-white line-clamp-2">{item.title}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span className="rounded-full border border-transparent bg-slate-200 px-2 py-0.5 font-medium text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
            {item.repo}
          </span>
          {item.detail && <span className="font-mono">{item.detail}</span>}
          <span className="font-mono tabular-nums">{timeAgo(item.at)}</span>
        </div>
      </div>
      <ExternalLink size={14} className="mt-1 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
    </motion.a>
  );
};

const GitHubFeed = () => {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisibleRef = useRef(false);
  // The IntersectionObserver callback closes over the first render, so "fetch
  // on first sight" is tracked in a ref. `seq` drops a slow earlier response
  // that lands after a newer one; `hasData` keeps the list when a refetch fails.
  const fetchedOnceRef = useRef(false);
  const seqRef = useRef(0);
  const hasDataRef = useRef(false);
  useEffect(() => {
    hasDataRef.current = items.length > 0;
  }, [items]);

  const load = async () => {
    const seq = ++seqRef.current;
    try {
      setLoading(true);
      // The server proxy is cached, token-authenticated and carries the
      // commits. Direct GitHub (60 req/h, events only) is the dev fallback
      // for `npm run dev` without the functions.
      let next: FeedItem[];
      const proxy = await fetch('/api/github').catch(() => null);
      if (proxy && proxy.ok) {
        const body = (await proxy.json()) as { events?: GitHubEvent[]; recent?: RecentWork };
        next = toFeedItems(body.recent, body.events ?? []);
      } else {
        const direct = await fetch(`https://api.github.com/users/${USERNAME}/events/public`);
        if (!direct.ok) throw new Error('Failed to fetch');
        const data = (await direct.json()) as GitHubEvent[];
        next = toFeedItems(undefined, data.filter((e) => ['PushEvent', 'PullRequestEvent', 'CreateEvent', 'WatchEvent'].includes(e.type)));
      }
      if (seq !== seqRef.current) return;
      setItems(next);
      setError(false);
    } catch (err) {
      console.error('GitHub API Error:', err);
      if (seq !== seqRef.current) return;
      if (!hasDataRef.current) setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
        if (entry.isIntersecting && !fetchedOnceRef.current) {
          fetchedOnceRef.current = true;
          load();
        }
      },
      { threshold: 0.1 },
    );
    if (containerRef.current) observer.observe(containerRef.current);
    const interval = setInterval(() => {
      if (isVisibleRef.current) load();
    }, 5 * 60 * 1000);
    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
    // Mount-only by design: the callback reads refs, not state.
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex h-[500px] w-full max-w-md flex-col overflow-hidden rounded-2xl lg:absolute lg:inset-0 lg:h-auto lg:max-w-none border border-slate-200 bg-white transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_30px_rgba(45,212,191,0.1)] dark:border-white/10 dark:bg-white/5"
    >
      <div className="z-10 border-b border-slate-200 bg-white/50 p-6 pb-4 backdrop-blur-sm dark:border-white/10 dark:bg-[#0F172A]/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Github className="text-slate-900 dark:text-white" size={20} />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Recent Commits</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-200">Live</span>
          </div>
        </div>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-white/80">Public repositories, last 30 days</p>
      </div>

      <div className="custom-scrollbar flex-1 space-y-1 overflow-y-auto p-2">
        {loading && items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-600 dark:text-slate-400">
            <Loader2 className="animate-spin" size={24} />
            <span className="text-xs">Connecting to GitHub...</span>
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-red-400">
            <AlertCircle size={24} />
            <span className="text-sm">Unable to load feed.</span>
            <button type="button" onClick={load} className="mt-2 text-xs text-primary underline hover:text-teal-400">
              Retry
            </button>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {items.length > 0 ? (
              items.map((item, index) => <ActivityItem key={item.id} item={item} index={index} />)
            ) : (
              <div className="py-10 text-center text-sm text-slate-500">No public commits in the last 30 days.</div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default GitHubFeed;
