import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Loader2, LogOut } from 'lucide-react';
import { PERSONAL_INFO } from '../constants';
import { fetchInsights, InsightsError, type Insights, type QuestionAt } from '../services/insightsService';
import { dailyCounts, hourlyCounts, timeZoneName } from '../utils/insightsView';
import { BarList, ColumnChart, DataTable, type Datum } from './insights/Charts';

/**
 * InsightsPage — what visitors ask the chat, at /insights. Private.
 *
 * Privacy is enforced by the server, not by hiding this page: nothing loads
 * without ANALYTICS_SECRET_TOKEN, the API sends aggregates rather than rows,
 * contact details visitors typed are redacted before they leave the server,
 * reads are rate limited, and the page is noindex. The page itself holds no
 * secret, so shipping it in the public build (as a lazy chunk visitors never
 * download) costs nothing — and it replaces an in-chat viewer that production
 * builds compiled out, which meant it could only be used by running the repo
 * locally against production credentials.
 *
 * The page is organised around one question — what should I write next? — so
 * the lists of questions the chat could not answer sit beside the charts, not
 * below them.
 */

/** sessionStorage, not localStorage: the token should not outlive the tab. */
const TOKEN_KEY = 'insights:token';

const readToken = () => {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
const writeToken = (t: string | null) => {
  try {
    if (t) sessionStorage.setItem(TOKEN_KEY, t);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable: the token lives only in memory */
  }
};

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

const Card = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f0d1f] p-5">
    <h2 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h2>
    {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
    <div className="mt-4">{children}</div>
  </section>
);

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f0d1f] px-4 py-3">
    <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
  </div>
);

const QuestionList = ({ items, empty }: { items: QuestionAt[]; empty: string }) =>
  items.length ? (
    <ul className="divide-y divide-slate-100 dark:divide-white/5 list-none p-0">
      {items.map((q, i) => (
        <li key={`${q.at}-${i}`} className="py-2">
          <p className="text-sm text-slate-800 dark:text-slate-100">{q.question}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{formatWhen(q.at)}</p>
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-slate-500 dark:text-slate-400">{empty}</p>
  );

const InsightsPage = () => {
  const [token, setToken] = useState<string | null>(() => (typeof window === 'undefined' ? null : readToken()));
  const [tokenInput, setTokenInput] = useState('');
  const [insights, setInsights] = useState<Insights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tables, setTables] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const previous = document.title;
    document.title = `Visitor insights | ${PERSONAL_INFO.name}`;
    return () => {
      document.title = previous;
    };
  }, []);

  const load = useCallback(async (t: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInsights(t, controller.signal);
      setInsights(data);
      writeToken(t);
      setToken(t);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const e = err instanceof InsightsError ? err : new InsightsError('unavailable');
      setError(e.message);
      // A rejected token must not linger and be retried on every visit.
      if (e.kind === 'unauthorized') {
        writeToken(null);
        setToken(null);
        setInsights(null);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  // A token saved earlier in this tab loads straight away.
  useEffect(() => {
    if (token && !insights) void load(token);
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on first mount
  }, []);

  const signOut = () => {
    writeToken(null);
    setToken(null);
    setInsights(null);
    setTokenInput('');
  };

  const daily = useMemo<Datum[]>(
    () => (insights ? dailyCounts(insights.timestamps).map((d) => ({ key: d.key, label: d.label, count: d.count })) : []),
    [insights],
  );
  const hourly = useMemo<Datum[]>(
    () => (insights ? hourlyCounts(insights.timestamps).map((h) => ({ key: String(h.hour), label: h.label, count: h.count })) : []),
    [insights],
  );
  const topics = useMemo<Datum[]>(() => (insights?.topics ?? []).map((t) => ({ key: t.id, label: t.label, count: t.count })), [insights]);
  const mentions = useMemo<Datum[]>(() => (insights?.mentions ?? []).map((m) => ({ key: m.label, label: m.label, count: m.count })), [insights]);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#030014] text-slate-800 dark:text-slate-200">
      <div className="mx-auto max-w-5xl px-5 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to portfolio
          </a>
          {insights && (
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-white/15 px-3 py-1.5 text-xs font-medium hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <LogOut size={14} aria-hidden="true" />
              Sign out
            </button>
          )}
        </div>

        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Visitor insights</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            What people ask the chat, and what it could not answer — the best signal for what to write next. Private:
            nothing loads without the analytics token, and this page is not indexed.
          </p>
        </header>

        <div role="status" aria-live="polite">
          {error && (
            <p className="mb-6 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
              {error}
            </p>
          )}
          {loading && <p className="sr-only">Loading insights.</p>}
        </div>

        {!insights && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (tokenInput.trim()) void load(tokenInput.trim());
            }}
            className="max-w-md rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f0d1f] p-5"
          >
            <label htmlFor="insights-token" className="block text-sm font-bold text-slate-800 dark:text-slate-100">
              Analytics token
            </label>
            <input
              id="insights-token"
              type="password"
              autoComplete="off"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 py-2 text-sm focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Kept for this tab only. The value of <code>ANALYTICS_SECRET_TOKEN</code> in Vercel.
            </p>
            <button
              type="submit"
              disabled={!tokenInput.trim() || loading}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-black disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {loading && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              {loading ? 'Loading…' : 'View insights'}
            </button>
          </form>
        )}

        {insights && insights.totals.questions === 0 && (
          <p className="text-sm text-slate-600 dark:text-slate-400">No questions recorded yet.</p>
        )}

        {insights && insights.totals.questions > 0 && (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                The {insights.rows.toLocaleString()} most recent questions, {formatDate(insights.from)} to{' '}
                {formatDate(insights.to)}.
              </p>
              <button
                type="button"
                aria-pressed={tables}
                onClick={() => setTables((v) => !v)}
                className="rounded-lg border border-slate-300 dark:border-white/15 px-3 py-1.5 text-xs font-medium hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {tables ? 'View as charts' : 'View as tables'}
              </button>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Stat label="Questions" value={insights.totals.questions.toLocaleString()} />
              <Stat label="Conversations" value={insights.totals.conversations.toLocaleString()} />
              <Stat label="Questions per conversation" value={String(insights.totals.medianPerConversation)} />
              <Stat label="Off-topic" value={insights.totals.offTopic.toLocaleString()} />
              <Stat label="Possible gaps" value={insights.totals.possibleGaps.toLocaleString()} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="Questions per day" subtitle="Last 30 days">
                {tables ? (
                  <DataTable data={daily} caption="Questions per day, last 30 days" labelHeader="Day" />
                ) : (
                  <ColumnChart data={daily} ariaLabel="Questions per day, last 30 days" labelEvery={7} />
                )}
              </Card>

              <Card title="When visitors ask" subtitle={`Hour of day, ${timeZoneName()}`}>
                {tables ? (
                  <DataTable data={hourly} caption="Questions by hour of day" labelHeader="Hour" />
                ) : (
                  <ColumnChart data={hourly} ariaLabel="Questions by hour of day" labelEvery={6} />
                )}
              </Card>

              <Card title="What they ask about" subtitle="The page section each answer drew on — the chat's own source chips">
                {tables ? (
                  <DataTable data={topics} caption="Questions by topic" labelHeader="Topic" />
                ) : (
                  <BarList data={topics} empty="No topics matched yet." />
                )}
              </Card>

              <Card title="Work they name" subtitle="Projects, employers and schools mentioned in the question">
                {tables ? (
                  <DataTable data={mentions} caption="Questions naming each piece of work" labelHeader="Work" />
                ) : (
                  <BarList data={mentions} empty="No project or employer named yet." />
                )}
              </Card>

              <Card
                title="Possible content gaps"
                subtitle="Heuristic: replies that admitted the record lacks something. Candidates to read, not a verdict."
              >
                <QuestionList items={insights.possibleGaps} empty="None found." />
              </Card>

              <Card title="Off-topic" subtitle="Answered with the prescribed redirect">
                <QuestionList items={insights.offTopic} empty="None." />
              </Card>
            </div>

            <div className="mt-4">
              <Card title="Recent questions" subtitle="Contact details visitors typed are redacted on the server">
                {insights.recent.length ? (
                  <ul className="divide-y divide-slate-100 dark:divide-white/5 list-none p-0">
                    {insights.recent.map((q, i) => (
                      <li key={`${q.at}-${i}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2">
                        <p className="min-w-0 flex-1 text-sm text-slate-800 dark:text-slate-100">{q.question}</p>
                        <p className="shrink-0 text-[11px] text-slate-500 dark:text-slate-400">
                          {q.topics.length ? `${q.topics.join(', ')} · ` : ''}
                          {formatWhen(q.at)}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">None.</p>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default InsightsPage;
