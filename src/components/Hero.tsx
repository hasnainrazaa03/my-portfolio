import React, { useState, Suspense } from 'react';
import { motion, useScroll, useTransform, AnimatePresence, type Variants } from 'framer-motion';
import { Download, Check, ArrowRight } from 'lucide-react';
import { PERSONAL_INFO } from '../constants';
import { scrollToSection } from '../utils/scroll';
import SocialLinks from './SocialLinks';
import ErrorBoundary from './ErrorBoundary';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useDataSaver } from '../hooks/useDataSaver';

const FlowField = React.lazy(() => import('./FlowField'));

/**
 * Entrance for the hero text — TRANSFORM ONLY, deliberately.
 *
 * The <h1> in this block is the page's Largest Contentful Paint element. The
 * shared `fadeInUp` variant starts at opacity 0, and an element at opacity 0
 * does not count as painted: LCP cannot fire until the fade has run. Measured
 * on a real device that put LCP ~600 ms after first paint; under Lighthouse's
 * mobile throttling it compounded into a 4.0 s LCP for a page that had every
 * byte downloaded by 0.5 s.
 *
 * Sliding from a small offset keeps the motion and paints the text on the
 * first frame, so LCP lands at first render. `fadeInUp` is still right for the
 * below-the-fold reveals, which are never the LCP candidate.
 */
const heroEntrance: Variants = {
  hidden: { y: 24 },
  visible: { y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

/** Tailwind's `md` breakpoint — must stay in step with the `md:block` below. */
const MD_BREAKPOINT = '(min-width: 768px)';

const Hero = () => {
  const { scrollY } = useScroll();
  // PERF: the wrapper is `hidden md:block`, but CSS only hides — React still
  // mounts, so every mobile visitor would download the chunk for a canvas
  // they cannot see. Gate the mount itself. Under Data Saver / a slow link
  // the picture is drawn once as an SVG instead of animated.
  const dataSaver = useDataSaver();
  const isDesktop = useMediaQuery(MD_BREAKPOINT);
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  
  const [isDownloaded, setIsDownloaded] = useState(false);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = '/resume.pdf'; 
    link.download = 'Hasnain_Raza_Resume.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setIsDownloaded(true);
    setTimeout(() => setIsDownloaded(false), 2000);
  };

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10">
        <div className="grid items-center gap-12 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          
          <motion.div 
            variants={heroEntrance}
            initial="hidden"
            animate="visible"
            className="space-y-6 relative z-20"
          >
            <span className="inline-block px-4 py-1 rounded-full bg-slate-200/50 dark:bg-white/10 border border-slate-300 dark:border-white/20 text-primary font-bold text-sm tracking-wide backdrop-blur-sm">
              {PERSONAL_INFO.tagline}
            </span>
            
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white leading-tight">
              {PERSONAL_INFO.title.split('|')[0]}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-600 to-purple-700 dark:via-blue-400 dark:to-purple-500">
                {PERSONAL_INFO.title.split('|')[1]}
              </span>
            </h1>

            <p className="max-w-xl text-balance text-xl leading-relaxed text-slate-600 dark:text-slate-300">
              {PERSONAL_INFO.bio}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <motion.button 
                onClick={handleDownload}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group relative flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-primary to-blue-600 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(45,212,191,0.3)] hover:shadow-[0_0_30px_rgba(45,212,191,0.5)] transition-all cursor-pointer w-full sm:w-auto"
                title="Download PDF (500KB)"
              >
                <div className="relative w-6 h-6">
                  <AnimatePresence mode='wait'>
                    {isDownloaded ? (
                      <motion.div
                        key="check"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute inset-0"
                      >
                        <Check size={24} />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="download"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute inset-0"
                      >
                        <Download size={24} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <span>{isDownloaded ? "Downloaded!" : "Download Résumé"}</span>
              </motion.button>

              <button 
                type="button"
                onClick={() => scrollToSection('projects')}
                className="group flex items-center justify-center gap-2 px-8 py-4 border border-slate-300 dark:border-white/30 text-slate-700 dark:text-white font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer backdrop-blur-sm w-full sm:w-auto"
              >
                View My Work
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            
            <div className="pt-6">
              <SocialLinks />
            </div>

            {/* Phones: the same experiment, simplified, under the introduction. */}
            {!isDesktop && (
              <div className="pt-10 md:hidden">
                <ErrorBoundary fallback={<div aria-hidden="true" />}>
                  <Suspense fallback={null}>
                    <FlowField compact motion={!dataSaver} />
                  </Suspense>
                </ErrorBoundary>
              </div>
            )}
          </motion.div>

          <motion.div 
            style={{ y: y1 }} 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="hidden md:block relative w-full"
          >
             {/* Local boundary: a failure in the canvas must leave an empty
                 column, never bubble to the app-level boundary and blank the
                 whole page (which is exactly what the old 3D hero did). The
                 boundary's default fallback is a visible error, so an empty
                 column is passed explicitly; the chunk is small, so nothing
                 is shown while it loads either. */}
             {isDesktop && (
               <ErrorBoundary fallback={<div aria-hidden="true" />}>
                 <Suspense fallback={null}>
                    <FlowField motion={!dataSaver} />
                 </Suspense>
               </ErrorBoundary>
             )}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;