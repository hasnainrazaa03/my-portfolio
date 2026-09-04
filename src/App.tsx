import React, { Suspense, lazy } from 'react';
import { MotionConfig } from 'framer-motion';
import { Analytics } from "@vercel/analytics/react";

// Hooks & Config
import { ThemeProvider } from './context/ThemeProvider';
import { parseProjectPath } from './utils/slug';

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
const ProjectDetailPage = lazy(() => import('./components/ProjectDetailPage'));
const Experience = lazy(() => import('./components/Experience'));
const Skills = lazy(() => import('./components/Skills'));
const Achievements = lazy(() => import('./components/Achievements'));
const Contact = lazy(() => import('./components/Contact'));

// Stand-alone routes (no router dep — selected by pathname in `App`).
const PrivacyPage = lazy(() => import('./components/PrivacyPage'));
const ResumePage = lazy(() => import('./components/ResumePage'));

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
  // Lightweight pathname routing: no router dependency.
  //
  // This REQUIRES the SPA rewrite in vercel.json. Nothing exists on disk at
  // /resume, /privacy or /projects/<slug>, so without it a direct visit or a
  // shared link 404s before any of this runs — which is exactly what production
  // did until 2026-09-04, while `vite preview` (which has its own fallback)
  // made every local check pass. spaRouting.test.js guards it.
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  if (path === '/privacy' || path === '/privacy/') {
    return (
      <ErrorBoundary>
        <Suspense fallback={<div className="min-h-screen" />}>
          <PrivacyPage />
        </Suspense>
      </ErrorBoundary>
    );
  }
  const projectSlug = parseProjectPath(path);
  if (projectSlug) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<div className="min-h-screen" />}>
          <ProjectDetailPage slug={projectSlug} />
        </Suspense>
      </ErrorBoundary>
    );
  }
  if (path === '/resume' || path === '/resume/') {
    return (
      <ErrorBoundary>
        <Suspense fallback={<div className="min-h-screen" />}>
          <ResumePage />
        </Suspense>
      </ErrorBoundary>
    );
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

        <Chatbot />
        <BackToTop />
        <KonamiEasterEgg />
        <Analytics />
      </div>
    </ErrorBoundary>
    </ThemeProvider>
    </MotionConfig>
  );
}
