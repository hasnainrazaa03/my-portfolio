import React from 'react';
import { PERSONAL_INFO } from '../constants';

/**
 * Standalone privacy disclosure page.
 *
 * Reachable at `/privacy` (resolved client-side via SPA fallback). Mirrors
 * the collapsible disclosure in the footer with a few extra sections so it
 * can be linked externally or printed.
 */
const PrivacyPage = () => {
  const updated = new Date().toISOString().slice(0, 10);
  return (
    <main className="min-h-screen bg-white dark:bg-[#030014] text-slate-800 dark:text-slate-200">
      <article className="max-w-3xl mx-auto px-6 py-16">
        <a
          href="/"
          className="inline-block mb-8 text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          &larr; Back to portfolio
        </a>

        <h1 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white">
          Privacy Notice
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-10">
          Last updated: <time dateTime={updated}>{updated}</time>
        </p>

        <section className="space-y-4 leading-relaxed">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            TL;DR
          </h2>
          <p>
            This site does <strong>not</strong> use third-party trackers,
            advertising cookies, or behavioural analytics. I do not sell or
            share personal data.
          </p>
        </section>

        <section className="mt-10 space-y-4 leading-relaxed">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Chat assistant
          </h2>
          <p>
            Messages you send to the in-page assistant are forwarded to a
            Vercel serverless function which calls a hosted LLM (HuggingFace
            or Google Gemini). The proxy is rate-limited per IP (10 requests
            per minute) and ignores any client-supplied context or provider
            hints. Recent Q&amp;A pairs are stored in Supabase to monitor
            quality.
          </p>
          <p>
            Your IP address is one-way hashed (SHA-256 + per-deploy salt)
            before storage. Raw IPs, <code>User-Agent</code>, and
            <code> Referer</code> headers are <strong>not</strong> persisted.
          </p>
        </section>

        <section className="mt-10 space-y-4 leading-relaxed">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Contact form
          </h2>
          <p>
            The contact form delivers messages directly to me via EmailJS.
            No copy of the message is stored on this site, and EmailJS
            forwards the email to my personal inbox.
          </p>
        </section>

        <section className="mt-10 space-y-4 leading-relaxed">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Cookies &amp; local storage
          </h2>
          <p>
            The site uses <code>localStorage</code> only for your theme
            preference (light / dark) and a small set of UI flags. No
            tracking or advertising identifiers are set.
          </p>
        </section>

        <section className="mt-10 space-y-4 leading-relaxed">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Your rights
          </h2>
          <p>
            To request deletion of any stored chat interaction associated
            with your hashed IP, email{' '}
            <a
              className="text-primary hover:underline"
              href={`mailto:${PERSONAL_INFO.email}`}
            >
              {PERSONAL_INFO.email}
            </a>
            . I will confirm deletion within 30 days.
          </p>
        </section>

        <section className="mt-10 space-y-4 leading-relaxed">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Security &amp; reporting
          </h2>
          <p>
            For security disclosures, see{' '}
            <a
              className="text-primary hover:underline"
              href="/.well-known/security.txt"
            >
              /.well-known/security.txt
            </a>
            .
          </p>
        </section>
      </article>
    </main>
  );
};

export default PrivacyPage;
