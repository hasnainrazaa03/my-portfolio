import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PROJECTS } from '../constants';
import { staggerContainer } from '../animations';
import ProjectCard from './ProjectCard';
import ProjectModal from './ProjectModal';

const Projects = () => {
  const [selectedProject, setSelectedProject] = useState(null);
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

  useEffect(() => {
    setCurrentPage(0);
  }, [activeTab]);

  useEffect(() => {
    if (totalPages <= 1) return;

    const interval = setInterval(() => {
      setCurrentPage(prev => (prev + 1) % totalPages);
    }, 5000);

    return () => clearInterval(interval);
  }, [totalPages]);

  const goToPage = (pageNumber) => {
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
          
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
              <span className="text-primary">03.</span> Featured Missions
            </h2>
            <p className="mt-4 text-slate-600 dark:text-slate-200 font-medium text-lg">
              Click on a mission card to view classified details.
            </p>
          </div>

          <div className="flex justify-center mb-12 overflow-x-auto pb-4 scrollbar-hide">
            <div className="flex space-x-2 bg-slate-200/50 dark:bg-white/10 p-1.5 rounded-xl border border-slate-300 dark:border-white/20 backdrop-blur-sm">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveTab(category)}
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
              className="text-center text-slate-500 dark:text-gray-300 py-20"
            >
              No missions found in this sector.
            </motion.div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-12">
              {Array.from({ length: totalPages }).map((_, idx) => (
                <motion.button
                  key={idx}
                  onClick={() => goToPage(idx)}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    currentPage === idx
                      ? 'bg-primary w-8'
                      : 'bg-slate-300 dark:bg-white/20 hover:bg-slate-400 dark:hover:bg-white/30'
                  }`}
                  aria-label={`Go to page ${idx + 1}`}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="text-center mt-4 text-sm text-slate-600 dark:text-slate-300 font-medium">
              Page {currentPage + 1} of {totalPages}
            </div>
          )}

        </div>
      </section>
    </>
  );
};

export default Projects;
