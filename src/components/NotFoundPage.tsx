import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { PERSONAL_INFO } from '../constants';

/**
 * Not-found page: rendered by App for any pathname it does not recognise, and
 * by ProjectDetailPage for a slug that matches no project.
 *
 * WHY THE APP RENDERS IT AT ALL: every real route is a file in the build
 * (scripts/routeHeads.js). Anything else is served from dist/404.html — a
 * build-time copy of index.html (scripts/spaNotFound.js) — with a genuine
 * 404 status, and this app boots on it. So a mistyped or stale URL gets the
 * right status AND a page in the site's own shell, instead of the home page
 * under the wrong address (what a catch-all rewrite once produced) or
 * Vercel's bare default.
 */
interface NotFoundPageProps {
  /** Tab title; the site name is appended. */
  documentTitle?: string;
  title?: string;
  message?: string;
  /** The one obvious way out. */
  action?: { href: string; label: string };
}

/**
 * Title the tab and keep the page out of the index while it is mounted.
 *
 * In production the 404 status already tells crawlers. The meta covers a
 * host with a blanket SPA fallback (vite preview), which answers 200 with
 * the shell for any path at all.
 */
function useNotFoundMeta(documentTitle: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${documentTitle} | ${PERSONAL_INFO.name}`;

    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex';
    document.head.appendChild(robots);

    return () => {
      document.title = previousTitle;
      robots.remove();
    };
  }, [documentTitle]);
}

const NotFoundPage = ({
  documentTitle = 'Page not found',
  title = 'That page doesn’t exist',
  message = 'The address may be mistyped, or the link is out of date.',
  action = { href: '/', label: 'Back to the home page' },
}: NotFoundPageProps) => {
  useNotFoundMeta(documentTitle);

  return (
    <main className="min-h-screen bg-white dark:bg-[#030014] text-slate-800 dark:text-slate-200">
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-primary">404</p>
        <h1 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">{title}</h1>
        <p className="mb-8 text-slate-600 dark:text-slate-400">{message}</p>
        <a
          href={action.href}
          className="inline-flex items-center gap-2 text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {action.label}
        </a>
      </div>
    </main>
  );
};

export default NotFoundPage;
