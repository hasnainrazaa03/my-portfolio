import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, AlertTriangle, Loader2, MessageSquareQuote } from 'lucide-react';
import { PERSONAL_INFO, PROJECTS, EXPERIENCE, EDUCATION } from '../constants';
import { toSlug } from '../utils/slug';
import { compareToJobDescription, FitError, type FitResult, type Verdict } from '../services/fitService';

/**
 * FitPage — paste a job description, get an honest comparison against the
 * record, at `/fit`.
 *
 * The design problem here is credibility, not layout. A recruiter has no
 * reason to trust a fit score published by the candidate, so the page is built
 * to be checkable rather than persuasive: every match names the project or
 * role it rests on and links to it, gaps are given the same visual weight as
 * matches rather than being tucked underneath, and the verdict is allowed to
 * say "weak". The server drops any match it cannot attribute to something
 * real (see api/_lib/fitAnalysis.ts), so what renders here is grounded by
 * construction, not by good intentions.
 *
 * It also states plainly that a model wrote it. Presenting a generated
 * assessment as if it were the candidate's own claim would be the dishonest
 * version of this feature.
 */

/** Longest posting the API accepts. Mirrors MAX_JD_CHARS in api/_lib/fitAnalysis.ts. */
const MAX_JD_CHARS = 12_000;
const MIN_JD_CHARS = 120;

const VERDICT_COPY: Record<Verdict, { label: string; className: string }> = {
  strong: {
    label: 'Strong match',
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  },
  partial: {
    label: 'Partial match',
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  },
  weak: {
    label: 'Weak match',
    className: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
  },
};

interface Source {
  label: string;
  href: string | null;
}

/**
 * Resolve a server-issued `sourceId` back to something the reader can click.
 *
 * Built from the same constants the server derived the ids from, so an id that
 * survived server-side validation resolves here too. An unknown id still
 * renders — as plain text without a link — rather than disappearing: silently
 * dropping a match at the last step would hide a real disagreement between the
 * two sides.
 */
function sourceIndex(): Map<string, Source> {
  const map = new Map<string, Source>();
  for (const p of PROJECTS) {
    map.set(`project:${toSlug(p.title)}`, { label: p.title, href: `/projects/${toSlug(p.title)}` });
  }
  for (const e of EXPERIENCE) {
    map.set(`role:${toSlug(e.company)}`, { label: `${e.role}, ${e.company}`, href: '/#experience' });
  }
  for (const ed of EDUCATION) {
    map.set(`education:${toSlug(ed.school)}`, { label: ed.school, href: '/#education' });
  }
  return map;
}

const FitPage = () => {
  const [jd, setJd] = useState('');
  const [result, setResult] = useState<FitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const sources = useMemo(() => sourceIndex(), []);

  useEffect(() => {
    const previous = document.title;
    document.title = `Compare a role | ${PERSONAL_INFO.name}`;
    return () => {
      document.title = previous;
    };
  }, []);

  // Abort an in-flight comparison if the page goes away, so a slow analysis
  // cannot resolve into an unmounted component.
  useEffect(() => () => abortRef.current?.abort(), []);

  const tooShort = jd.trim().length > 0 && jd.trim().length < MIN_JD_CHARS;
  const canSubmit = jd.trim().length >= MIN_JD_CHARS && !busy;

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setBusy(true);
      setError(null);
      setResult(null);
      try {
        const next = await compareToJobDescription(jd.trim(), controller.signal);
        setResult(next);
        // Move focus to the result: on a phone the analysis lands well below
        // the fold, and a screen-reader user gets no announcement otherwise.
        requestAnimationFrame(() => resultRef.current?.focus());
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof FitError ? err.message : 'Something went wrong. Please try again.');
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    },
    [canSubmit, jd],
  );

  return (
    <main className="min-h-screen bg-white dark:bg-[#030014] text-slate-800 dark:text-slate-200">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <a
          href="/"
          className="inline-flex items-center gap-2 mb-8 text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to portfolio
        </a>

        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
            Does this role fit?
          </h1>
          <p className="mt-3 text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            Paste a job description. You&rsquo;ll get what my record actually supports, what it
            doesn&rsquo;t, and a link to the work behind every claim.
          </p>
          {/* Said up front, not in a footnote. A generated assessment presented
              as the candidate's own claim would be the dishonest version. */}
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Written by a language model from my projects and roles, and restricted to those. It is
            told to report gaps, so expect it to disagree with me sometimes.
          </p>
        </header>

        <form onSubmit={submit} className="mb-10">
          <label htmlFor="jd" className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-200">
            Job description
          </label>
          <textarea
            id="jd"
            value={jd}
            onChange={(e) => setJd(e.target.value.slice(0, MAX_JD_CHARS))}
            rows={12}
            spellCheck={false}
            placeholder="Paste the full posting — responsibilities and requirements included."
            aria-describedby="jd-hint"
            className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-white/5 p-4 text-sm leading-relaxed focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <div id="jd-hint" className="mt-2 flex flex-wrap gap-x-4 gap-y-1 justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{tooShort ? `At least ${MIN_JD_CHARS} characters — paste the whole posting.` : 'Nothing is stored.'}</span>
            <span>
              {jd.length.toLocaleString()} / {MAX_JD_CHARS.toLocaleString()}
            </span>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-black font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {busy ? 'Comparing…' : 'Compare'}
          </button>
        </form>

        {/* Errors are announced: the button returns to its resting state and a
            sighted user sees red, but nothing else would tell a screen reader. */}
        <div role="status" aria-live="polite">
          {busy && <p className="sr-only">Comparing the posting against the record.</p>}
          {error && (
            <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
              {error}
            </p>
          )}
        </div>

        {result && (
          <div ref={resultRef} tabIndex={-1} className="focus:outline-none">
            <div
              className={`inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-bold ${VERDICT_COPY[result.verdict].className}`}
            >
              {VERDICT_COPY[result.verdict].label}
            </div>
            <p className="mt-4 text-lg leading-relaxed text-slate-700 dark:text-slate-200">{result.summary}</p>

            {result.matches.length > 0 && (
              <section className="mt-10">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-primary mb-4">
                  What the record supports
                </h2>
                <ul className="space-y-4 list-none p-0">
                  {result.matches.map((m, i) => {
                    const source = sources.get(m.sourceId);
                    return (
                      <li
                        key={`${m.sourceId}-${i}`}
                        className="rounded-xl border border-slate-200 dark:border-white/10 p-4"
                      >
                        <div className="flex items-start gap-3">
                          <Check size={18} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{m.requirement}</p>
                            <p className="mt-1 text-sm leading-relaxed">{m.evidence}</p>
                            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                              Evidence:{' '}
                              {source?.href ? (
                                <a
                                  href={source.href}
                                  className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                                >
                                  {source.label}
                                </a>
                              ) : (
                                source?.label ?? m.sourceId
                              )}
                            </p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {result.gaps.length > 0 && (
              <section className="mt-10">
                {/* Same weight as the matches above, deliberately. A fit tool
                    that buries its gaps is a sales page. */}
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-primary mb-4">
                  What it doesn&rsquo;t
                </h2>
                <ul className="space-y-4 list-none p-0">
                  {result.gaps.map((g, i) => (
                    <li key={i} className="rounded-xl border border-slate-200 dark:border-white/10 p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{g.requirement}</p>
                          <p className="mt-1 text-sm leading-relaxed">{g.note}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {result.talkingPoints.length > 0 && (
              <section className="mt-10">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-primary mb-4">
                  Worth asking me about
                </h2>
                <ul className="space-y-2 list-none p-0">
                  {result.talkingPoints.map((t, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm leading-relaxed">
                      <MessageSquareQuote size={16} className="mt-1 shrink-0 text-primary" aria-hidden="true" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <p className="mt-10 border-t border-slate-200 dark:border-white/10 pt-4 text-sm text-slate-600 dark:text-slate-400">
              Want to dig into any of this?{' '}
              <a
                href={`mailto:${PERSONAL_INFO.email}`}
                className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              >
                {PERSONAL_INFO.email}
              </a>
            </p>
          </div>
        )}
      </div>
    </main>
  );
};

export default FitPage;
