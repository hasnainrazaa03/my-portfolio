import React from 'react';
import { PERSONAL_INFO } from '../constants';
import SocialLinks from './SocialLinks';

const Footer = () => (
  <footer className="bg-transparent py-8 border-t border-white/10">
    <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-4">
      <SocialLinks />
      <div className="text-center text-slate-500 dark:text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} {PERSONAL_INFO.name}. Designed in the cosmos.</p>
      </div>
      <nav aria-label="Footer" className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <a href="/privacy" className="hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
          Privacy policy
        </a>
        <span aria-hidden="true">·</span>
        <a href="/resume" className="hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
          Resume
        </a>
        <span aria-hidden="true">·</span>
        <a href="/.well-known/security.txt" className="hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
          Security
        </a>
      </nav>
      <details className="text-center text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
        <summary className="cursor-pointer hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
          Privacy
        </summary>
        <div className="mt-3 space-y-2 text-left leading-relaxed">
          <p>
            This site does <strong>not</strong> use third-party trackers, advertising
            cookies, or behavioural analytics. No personal data is sold or shared.
          </p>
          <p>
            <strong>Chat assistant.</strong> Messages you send to the in-page assistant are
            forwarded to a server proxy (Vercel) which calls a hosted LLM (HuggingFace
            or Google Gemini) and is rate-limited per IP. Recent Q&amp;A pairs are stored
            in Supabase to improve the assistant. <em>Your IP is one-way hashed
            (SHA-256 + per-deploy salt) before storage</em> — raw IPs, user-agent,
            and referrer are never persisted.
          </p>
          <p>
            <strong>Contact form.</strong> Submissions are delivered to me directly via
            EmailJS. No copy is stored on this site.
          </p>
          <p>
            <strong>Your rights.</strong> To request deletion of any stored chat
            interaction, email{' '}
            <a className="text-primary hover:underline" href={`mailto:${PERSONAL_INFO.email}`}>
              {PERSONAL_INFO.email}
            </a>
            .
          </p>
        </div>
      </details>
    </div>
  </footer>
);

export default Footer;