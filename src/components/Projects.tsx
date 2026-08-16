import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PROJECTS } from '../constants';
import ProjectCard from './ProjectCard';
import SectionHeading from './ui/SectionHeading';
import ProjectModal from './ProjectModal';
import type { Project } from '../types/content';

const Projects = () => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState("All");
  const [currentPage, setCurrentPage] = useState(0);

  const categories = useMemo(() => ["All", ...new Set(PROJECTS.map(p => p.category))], []);
  
  const filteredProjects = useMemo(
    () => activeTab === "All" ? PROJECTS : PROJECTS.filter(project => project.category === activeTab),
    [activeTab]
  );

  const projectsPerPage = 3;
  const totalPages = Math.ceil(filteredProjects.length / projectsPerPage);
  const startIndex = currentPage * projectsPerPage;
  const visibleProjects = filteredProjects.slice(startIndex, startIndex + projectsPerPage);

  // A11Y: Removed the 5-second auto-rotating carousel (WCAG 2.2.2 "Pause,
  // Stop, Hide"). Users now control pagination explicitly via the
  // page-indicator buttons below.

  const goToPage = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  return (
    <>
      <AnimatePresence>
        {selectedProject && (
          <ProjectModal 
            project={selectedProject} 
            onClose={() => setSelectedProject(null)} 
          />
        )}
      </AnimatePresence>

      <section id="projects" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <SectionHeading
            number="03"
            title="Featured Missions"
            subtitle="Click on a mission card to view classified details."
          />
          <div className="flex justify-center mb-12 overflow-x-auto pb-4 scrollbar-hide">
            <div className="flex space-x-2 bg-slate-200/50 dark:bg-white/10 p-1.5 rounded-xl border border-slate-300 dark:border-white/20 backdrop-blur-sm">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    setActiveTab(category);
                    setCurrentPage(0);
                  }}
                  className={`relative px-5 py-2.5 text-sm font-medium rounded-lg outline-none transition-colors duration-200 z-10 whitespace-nowrap ${
                    activeTab === category 
                      ? 'text-white dark:text-black font-bold' 
                      : 'text-slate-600 dark:text-white hover:text-slate-900 dark:hover:text-primary'
                  }`}
                  style={{ minWidth: '80px' }}
                >
                  {activeTab === category && (
                    <motion.div
                      layoutId="activeFilterTab"
                      className="absolute inset-0 bg-slate-800 dark:bg-primary rounded-lg -z-10 shadow-lg"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  {category}
                </button>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch min-h-0">
            <AnimatePresence mode='wait'>
              {visibleProjects.map((project) => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <ProjectCard 
                    project={project} 
                    onClick={setSelectedProject}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filteredProjects.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="text-center text-slate-500 dark:text-slate-300 py-20"
            >
              No missions found in this sector.
            </motion.div>
          )}

          {totalPages > 1 && (
            <nav className="mt-12 flex items-center justify-center gap-2" aria-label="Project pages">
              <button
                type="button"
                onClick={() => goToPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                aria-label="Previous page"
                className="grid h-11 w-11 place-items-center rounded-full text-slate-600 transition-colors hover:bg-slate-200 disabled:pointer-events-none disabled:opacity-30 dark:text-slate-300 dark:hover:bg-white/10"
              >
                <ChevronLeft size={20} aria-hidden="true" />
              </button>

              {Array.from({ length: totalPages }).map((_, idx) => (
                // The visible dot stays small, but the BUTTON is 44px so the
                // hit area clears the 24px WCAG 2.5.8 minimum — the old dots
                // were 12x12 with no padding.
                <button
                  key={idx}
                  type="button"
                  onClick={() => goToPage(idx)}
                  aria-label={`Go to page ${idx + 1} of ${totalPages}`}
                  aria-current={currentPage === idx ? 'true' : undefined}
                  className="group grid h-11 w-11 place-items-center rounded-full"
                >
                  <span
                    className={`block h-3 rounded-full transition-all duration-300 ${
                      currentPage === idx
                        ? 'w-8 bg-primary'
                        : 'w-3 bg-slate-300 group-hover:bg-slate-400 dark:bg-white/20 dark:group-hover:bg-white/30'
                    }`}
                  />
                </button>
              ))}

              <button
                type="button"
                onClick={() => goToPage(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage === totalPages - 1}
                aria-label="Next page"
                className="grid h-11 w-11 place-items-center rounded-full text-slate-600 transition-colors hover:bg-slate-200 disabled:pointer-events-none disabled:opacity-30 dark:text-slate-300 dark:hover:bg-white/10"
              >
                <ChevronRight size={20} aria-hidden="true" />
              </button>
            </nav>
          )}

          {totalPages > 1 && (
            // aria-live so the count is announced when the page changes —
            // otherwise a screen-reader user gets no feedback that the grid
            // behind them was replaced.
            <div
              className="text-center mt-2 text-sm text-slate-600 dark:text-slate-300 font-medium"
              aria-live="polite"
            >
              Page {currentPage + 1} of {totalPages}
            </div>
          )}

        </div>
      </section>
    </>
  );
};

export default Projects;
