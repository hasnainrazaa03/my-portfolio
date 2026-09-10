import React, { useCallback, useEffect, useState } from 'react';
import { PERSONAL_INFO } from '../constants';
import DesignedResume from './resume/DesignedResume';
import AtsResume from './resume/AtsResume';
import { searchForView, viewFromSearch, VIEW_PARAM, type ResumeView } from './resume/resumeView';

/**
 * Print-optimised résumé at `/resume`, data-driven from `src/constants.ts`.
 *
 * TWO VIEWS, ONE SET OF FACTS. The designed view is for a human; the ATS view
 * is for the parser that reads the résumé before any human does. Both render
 * from `resume/resumeData.ts`, so they can differ in layout and never in what
 * they claim — see `AtsResume` for what actually changes and why.
 *
 * The choice lives in the URL (`?view=ats`) rather than in state alone, so it
 * survives a reload, can be bookmarked, and can be sent to someone as the view
 * you meant them to see.
 */
const ResumePage = () => {
  const [view, setView] = useState<ResumeView>(() =>
    typeof window === 'undefined' ? 'designed' : viewFromSearch(window.location.search),
  );

  useEffect(() => {
    const prev = document.title;
    document.title = `${PERSONAL_INFO.name} — Resume`;
    return () => {
      document.title = prev;
    };
  }, []);

  // Keep the URL in step, and keep the Back button meaningful: switching views
  // is a navigation the reader may want to undo.
  const choose = useCallback((next: ResumeView) => {
    setView(next);
    if (typeof window === 'undefined') return;
    window.history.pushState({ [VIEW_PARAM]: next }, '', `${window.location.pathname}${searchForView(next)}`);
  }, []);

  useEffect(() => {
    const onPop = () => setView(viewFromSearch(window.location.search));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const tab = (value: ResumeView, label: string, hint: string) => (
    <button
      type="button"
      onClick={() => choose(value)}
      aria-pressed={view === value}
      title={hint}
      className={`px-3 py-1.5 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        view === value
          ? 'bg-slate-900 text-white'
          : 'text-slate-700 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <main className="bg-white text-slate-900 min-h-screen">
      {/* Toolbar — hidden when printing, so neither view carries chrome onto paper. */}
      <div className="print:hidden border-b border-slate-200 bg-slate-50">
        <div className="max-w-3xl mx-auto px-6 py-3 flex flex-wrap items-center gap-3 justify-between text-sm">
          <a
            href="/"
            className="text-slate-700 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            &larr; Back to portfolio
          </a>

          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1"
              role="group"
              aria-label="Résumé view"
            >
              {tab('designed', 'Designed', 'Laid out for a person to read')}
              {tab('ats', 'Plain text (ATS)', 'One column, full URLs, standard headings — for applicant tracking systems')}
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-1.5 rounded-md bg-primary text-black font-medium hover:bg-teal-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Print / Save as PDF
            </button>
          </div>
        </div>
      </div>

      {view === 'ats' ? <AtsResume /> : <DesignedResume />}
    </main>
  );
};

export default ResumePage;
