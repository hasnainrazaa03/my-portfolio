import React from 'react';
import { Analytics } from "@vercel/analytics/react";

// Hooks & Config
import { useContentProtection } from './hooks/useContentProtection';
import { useDarkMode } from './hooks/useDarkMode';
import { CONFIG } from './constants';

// Components
import ErrorBoundary from './components/ErrorBoundary';
import PageTitleUpdater from './components/PageTitleUpdater';
import SpaceBackground from './components/SpaceBackground';
import Navigation from './components/Navigation';
import Hero from './components/Hero';
import About from './components/About';
import Education from './components/Education';
import Projects from './components/Projects';
import GitHubSection from './components/GitHubSection';
import Experience from './components/Experience';
import Skills from './components/Skills';
import Contact from './components/Contact';
import Footer from './components/Footer';
import ScrollProgress from './components/ScrollProgress';
import Chatbot from './components/Chatbot';
import BackToTop from './components/BackToTop';

export default function App() {
  useContentProtection(CONFIG.enableContentProtection);
  const [isDark, setIsDark] = useDarkMode();
  const toggleTheme = () => setIsDark(!isDark);
  
  return (
    <ErrorBoundary>
      <div className={`relative min-h-screen font-sans selection:bg-primary selection:text-black overflow-hidden ${CONFIG.enableContentProtection ? 'select-none' : ''}`}>
        <PageTitleUpdater />

        <SpaceBackground isDark={isDark} />
        
        <ScrollProgress />

        <div className="relative z-10">
          <Navigation isDark={isDark} toggleTheme={toggleTheme} />
          <Hero />
          <About />
          <Education />
          <Projects />
          <GitHubSection isDark={isDark} />
          <Experience />
          <Skills />
          <Contact />
          <Footer />
        </div>

        <Chatbot />
        <BackToTop />
        <Analytics />
      </div>
    </ErrorBoundary>
  );
}
