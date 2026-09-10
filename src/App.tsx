import React, { Suspense, lazy, useEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { Analytics } from "@vercel/analytics/react";

// Hooks & Config
import { ThemeProvider } from './context/ThemeProvider';
import { canonicalProjectPath, parseProjectPath } from './utils/slug';
import { scrollToSection } from './utils/scroll';

// Above-the-fold (eager) components
import ErrorBoundary from './components/ErrorBoundary';
import PageTitleUpdater from './components/PageTitleUpdater';
import SpaceBackground from './components/SpaceBackground';
import Navigation from './components/Navigation';
import Hero from './components/Hero';
import About from './components/About';
import ScrollProgress from './components/ScrollProgress';

import BackToTop from './components/BackToTop';
import CursorGlow from './components/CursorGlow';
import Footer from './components/Footer';
import KonamiEasterEgg from './components/KonamiEasterEgg';

// PERF: Below-the-fold sections are code-split via React.lazy so the initial
// JS payload only ships what the user can see above the fold.
const Education = lazy(() => import('./components/Education'));
const Projects = lazy(() => import('./components/Projects'));
const GitHubSection = lazy(() => import('./components/GitHubSection'));
/**
 * The chat panel is an overlay nobody sees until they click the launcher, and
 * it drags in the whole local Q&A corpus for offline/instant answers. Keeping
 * it eager put that corpus on the critical path, where it competed with first
 * paint and capped how far the answer bank could grow.
 */
const Chatbot = lazy(() => import('./components/Chatbot'));

/**
 * Mount the chat widget once the browser is idle, not at hydration.
 *
 * `lazy()` only splits the bundle; the fetch still fires the moment the
 * component renders. On the Lighthouse mobile trace the 30 KB Chatbot chunk
 * left at 541 ms — immediately after hydration, in the same window the hero is
 * trying to paint — for a panel nobody has opened. Deferring it to idle takes
 * it out of that contention entirely. Chat widgets from Intercom onward do
 * exactly this; the launcher arriving a beat later is the expected trade.
 *
 * The timeout is the safety net: `requestIdleCallback` can starve on a busy
 * page, and Safari has no such API at all.
 */
function useIdleMount(timeoutMs = 3000): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(() => setReady(true), { timeout: timeoutMs });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => setReady(true), Math.min(timeoutMs, 1500));
    return () => window.clearTimeout(id);
  }, [timeoutMs]);
  return ready;
}
const ProjectDetailPage = lazy(() => import('./components/ProjectDetailPage'));
const Experience = lazy(() => import('./components/Experience'));
const Skills = lazy(() => import('./components/Skills'));
const Achievements = lazy(() => import('./components/Achievements'));
const Contact = lazy(() => import('./components/Contact'));

// Stand-alone routes (no router dep — selected by pathname in `App`).
const PrivacyPage = lazy(() => import('./components/PrivacyPage'));
const ResumePage = lazy(() => import('./components/ResumePage'));
const NotFoundPage = lazy(() => import('./components/NotFoundPage'));

/**
 * Shared shell for the stand-alone routes.
 *
 * They used to return bare <ErrorBoundary><Suspense> trees, OUTSIDE the
 * ThemeProvider — and the `dark` / `hc` classes are only ever applied by that
 * provider's effects. Every `dark:` style on /privacy and /projects/<slug> was
 * dead: a dark-mode visitor clicking "Open the full case study" got a white
 * page with their saved preference ignored. They also skipped <Analytics />,
 * so those routes never registered a page view.
 */
function StandalonePage({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <ErrorBoundary>
          <Suspense fallback={<div className="min-h-screen" />}>{children}</Suspense>
          <Analytics />
        </ErrorBoundary>
      </ThemeProvider>
    </MotionConfig>
  );
}

/**
 * Resolve `/#projects`-style links once the target has mounted.
 *
 * The sections are lazy chunks. A browser makes its last native fragment
 * scroll attempt at `load`, which on a cold cache is before the chunk has
 * committed, so "Back to all projects" from a case study landed at the top of
 * the page. Poll briefly for the element and scroll when it exists.
 */
function useScrollToHashWhenReady(): void {
  useEffect(() => {
    const id = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
    if (!id) return;
    const deadline = Date.now() + 4000;
    let raf = 0;
    const tick = () => {
      if (document.getElementById(id)) {
        scrollToSection(id);
        return;
      }
      if (Date.now() < deadline) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
}

// Lightweight placeholder for lazy sections — keeps layout stable without flashing.
const SectionFallback = () => (
  <div aria-hidden="true" className="min-h-[40vh]" />
);

/**
 * `reducedMotion="user"` is the single switch for the whole motion system.
 *
 * The app had 16 `whileInView` reveals and 9 hover animations across 11
 * components — 40px slides, 0.8->1 scales, spring bounces — and the
 * `useReducedMotion()` hook was wired into exactly ONE of them (CursorGlow).
 * Everyone who asks their OS for less motion got all of it anyway.
 *
 * MotionConfig makes Framer honour the media query globally: transform-based
 * animations (x/y/scale/rotate) are skipped while opacity still animates, so
 * content fades in without moving. That is the recommended behaviour and it
 * beats threading a hook through every call site, which drifts.
 */
export default function App() {
  const chatReady = useIdleMount();
  useScrollToHashWhenReady();
  // Lightweight pathname routing: no router dependency.
  //
  // Every route here is also a FILE in the build: scripts/routeHeads.js writes
  // dist/resume.html, dist/privacy.html and dist/projects/<slug>.html from
  // src/utils/routeMeta.ts, and Vercel serves them extensionless (cleanUrls).
  // That is the only reason a direct visit or a shared link works — production
  // 404'd on all three families until 2026-09-04, while `vite preview` (which
  // has its own fallback) made every local check pass. spaRouting.test.js
  // holds this routing and that file list together.
  //
  // Anything else — a mistyped path, a stale project slug — is served by
  // Vercel from dist/404.html, a build-time copy of index.html
  // (scripts/spaNotFound.js), with a real 404 status; this function then
  // renders the not-found page for it.
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  if (path === '/privacy' || path === '/privacy/') {
    return <StandalonePage><PrivacyPage /></StandalonePage>;
  }
  const projectSlug = parseProjectPath(path);
  if (projectSlug) {
    // Only the lowercase, unescaped form exists as a file, so /projects/USC-Ledger
    // is served by the 404 shell — the reader would see the full case study at a
    // URL that returned 404 to everything else. Send them to the real one.
    const canonical = canonicalProjectPath(path);
    if (canonical && typeof window !== 'undefined') {
      window.location.replace(`${canonical}${window.location.hash}`);
      return null;
    }
    return <StandalonePage><ProjectDetailPage slug={projectSlug} /></StandalonePage>;
  }
  if (path === '/resume' || path === '/resume/') {
    return <StandalonePage><ResumePage /></StandalonePage>;
  }
  if (path !== '/' && path !== '/index.html') {
    return <StandalonePage><NotFoundPage /></StandalonePage>;
  }

  return (
    <MotionConfig reducedMotion="user">
    <ThemeProvider>
    <ErrorBoundary>
      <div className="relative min-h-screen font-sans selection:bg-primary selection:text-black overflow-hidden">
        {/* A11Y: Skip-to-content link — invisible until focused via Tab */}
        <a href="#main-content" className="skip-to-content">Skip to main content</a>

        <PageTitleUpdater />

        <SpaceBackground />
        <CursorGlow />
        
        <ScrollProgress />

        <div className="relative z-10">
          <Navigation />
          <main id="main-content">
            <Hero />
            <About />
            <Suspense fallback={<SectionFallback />}>
              <Education />
              <Projects />
              <GitHubSection />
              <Experience />
              <Skills />
              <Achievements />
              <Contact />
            </Suspense>
          </main>
          <Footer />
        </div>

        {/* Suspense is REQUIRED around a lazy() component. An earlier change
            intended to add it and silently did not; the widget only rendered
            because React tolerates an unbounded suspension on initial render.
            No fallback: the launcher is a fixed overlay, so there is nothing to
            reserve and nothing shifts when it arrives. */}
        {chatReady && (
          <Suspense fallback={null}>
            <Chatbot />
          </Suspense>
        )}
        <BackToTop />
        <KonamiEasterEgg />
        <Analytics />
      </div>
    </ErrorBoundary>
    </ThemeProvider>
    </MotionConfig>
  );
}
