import React, { Suspense, lazy } from 'react';
import { Analytics } from "@vercel/analytics/react";

// Hooks & Config
import { useDarkMode } from './hooks/useDarkMode';

// Above-the-fold (eager) components
import ErrorBoundary from './components/ErrorBoundary';
import PageTitleUpdater from './components/PageTitleUpdater';
import SpaceBackground from './components/SpaceBackground';
import Navigation from './components/Navigation';
import Hero from './components/Hero';
import About from './components/About';
import ScrollProgress from './components/ScrollProgress';
import Chatbot from './components/Chatbot';
import BackToTop from './components/BackToTop';
import Footer from './components/Footer';
import KonamiEasterEgg from './components/KonamiEasterEgg';

// PERF: Below-the-fold sections are code-split via React.lazy so the initial
// JS payload only ships what the user can see above the fold.
const Education = lazy(() => import('./components/Education'));
const Projects = lazy(() => import('./components/Projects'));
const GitHubSection = lazy(() => import('./components/GitHubSection'));
const Experience = lazy(() => import('./components/Experience'));
const Skills = lazy(() => import('./components/Skills'));
const Contact = lazy(() => import('./components/Contact'));

// Stand-alone routes (no router dep — selected by pathname in `App`).
const PrivacyPage = lazy(() => import('./components/PrivacyPage'));
const ResumePage = lazy(() => import('./components/ResumePage'));

// Lightweight placeholder for lazy sections — keeps layout stable without flashing.
const SectionFallback = () => (
  <div aria-hidden="true" className="min-h-[40vh]" />
);

export default function App() {
  const [isDark, setIsDark] = useDarkMode();
  const toggleTheme = () => setIsDark(!isDark);

  // Lightweight pathname routing: no router dependency. Vercel's SPA
  // fallback rewrites unknown paths to index.html, so /privacy and /resume
  // land here and render the appropriate component.
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
    <ErrorBoundary>
      <div className="relative min-h-screen font-sans selection:bg-primary selection:text-black overflow-hidden">
        {/* A11Y: Skip-to-content link — invisible until focused via Tab */}
        <a href="#main-content" className="skip-to-content">Skip to main content</a>

        <PageTitleUpdater />

        <SpaceBackground isDark={isDark} />
        
        <ScrollProgress />

        <div className="relative z-10">
          <Navigation isDark={isDark} toggleTheme={toggleTheme} />
          <main id="main-content">
            <Hero />
            <About />
            <Suspense fallback={<SectionFallback />}>
              <Education />
              <Projects />
              <GitHubSection isDark={isDark} />
              <Experience />
              <Skills />
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
  );
}
