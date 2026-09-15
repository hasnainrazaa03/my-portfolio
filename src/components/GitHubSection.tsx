import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Github, ExternalLink, Code, Star, GitCommit } from 'lucide-react';
import { GitHubCalendar } from 'react-github-calendar';
import { PERSONAL_INFO } from '../constants';
import GitHubFeed from './GitHubFeed';
import SectionHeading from './ui/SectionHeading';
import { fadeInUp } from '../animations';
import { useTheme } from '../context/ThemeContext';

/**
 * The calendar is 53 columns wide. Size the blocks to the card so the whole
 * year shows without scrolling; below the size where a block stops reading
 * as a block, keep a fixed size and scroll — starting from the recent end,
 * which is the end a visitor came to see. (An rtl scroll container opens
 * scrolled to its end; the calendar inside is set back to ltr.)
 */
const WEEKS = 53;
const MIN_BLOCK = 8;
const LABEL_GUTTER = 36;

function useCalendarSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ block: 12, margin: 4, fits: true });
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const width = el.clientWidth;
      if (!width) return;
      const margin = width > 640 ? 4 : 3;
      const block = Math.floor((width - LABEL_GUTTER) / WEEKS) - margin;
      if (block >= MIN_BLOCK) setSize({ block: Math.min(block, 13), margin, fits: true });
      else setSize({ block: 10, margin: 3, fits: false });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

const GitHubSection = () => {
  const { isDark } = useTheme();
  const username = PERSONAL_INFO.socials.github.split('/').pop() ?? '';
  const calendarRef = useRef<HTMLDivElement>(null);
  const size = useCalendarSize(calendarRef);

  const explicitTheme = {
    light: ['#e2e8f0', '#99f6e4', '#5eead4', '#2dd4bf', '#115e59'],
    dark: [
      '#1e293b', 
      '#134e4a', 
      '#14b8a6', 
      '#2dd4bf', 
      '#5eead4', 
    ],
  };

  return (
    <section id="github" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <SectionHeading
            number="04"
            title="Open Source Activity"
            subtitle="Real-time contribution data from GitHub"
            eyebrow={<Github size={40} className="text-slate-900 dark:text-white" />}
          />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          <div className="w-full order-2 lg:order-1 flex justify-center lg:block">
            <GitHubFeed />
          </div>

          <div className="w-full order-1 lg:order-2 space-y-6 lg:col-span-2">
            
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden bg-white dark:bg-white/5 hover:border-primary/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(45,212,191,0.1)]"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <GitCommit className="text-primary" size={20} />
                    Contribution Graph
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-white/80 font-medium">
                    Commit history for the last year
                  </p>
                </div>
                <a 
                  href={PERSONAL_INFO.socials.github}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm font-bold text-primary hover:text-teal-400 transition-colors px-4 py-2 bg-primary/10 rounded-lg border border-primary/20"
                >
                  View Profile <ExternalLink size={14} />
                </a>
              </div>

              <div
                ref={calendarRef}
                dir={size.fits ? 'ltr' : 'rtl'}
                className={`w-full ${size.fits ? 'overflow-hidden' : 'overflow-x-auto pb-4 thin-scrollbar-x'}`}
              >
                <div dir="ltr" className={size.fits ? '' : 'inline-block pr-4'}>
                  <GitHubCalendar
                    username={username}
                    colorScheme={isDark ? 'dark' : 'light'}
                    theme={explicitTheme}
                    fontSize={size.block >= 11 ? 14 : 12}
                    blockSize={size.block}
                    blockMargin={size.margin}
                    blockRadius={3}
                    labels={{
                      totalCount: '{{count}} contributions shown',
                    }}
                    style={{
                      color: isDark ? '#ffffff' : '#0f172a',
                    }}
                  />
                </div>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 flex flex-col justify-center bg-white dark:bg-white/5 hover:border-primary/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(45,212,191,0.1)]">
                <h4 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Code size={18} className="text-primary" />
                  Top Languages
                </h4>
                <div className="flex gap-2 flex-wrap">
                  {["Python", "JavaScript", "C++", "MATLAB", "HTML/CSS"].map(lang => (
                    <span 
                      key={lang} 
                      className="text-xs font-bold px-3 py-1.5 rounded-md text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors cursor-default"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 flex flex-col justify-center items-center text-center bg-white dark:bg-white/5 hover:border-primary/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(45,212,191,0.1)]">
                <div className="mb-2 p-3 bg-primary/10 rounded-full text-primary animate-pulse">
                  <Star size={24} />
                </div>
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  Open to Work
                </span>
                <p className="text-xs text-slate-500 dark:text-white/80 mt-1 font-medium">
                  Always coding, always building.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

export default GitHubSection;