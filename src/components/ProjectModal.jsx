import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Github, ExternalLink, X, ChevronLeft, ChevronRight, 
  Code, Terminal, Cpu, Database, Globe, Layers, Wind, Server 
} from 'lucide-react';

const getTechIcon = (tech) => {
  const lowerTech = tech.toLowerCase();
  if (lowerTech.includes('react') || lowerTech.includes('web')) return Globe;
  if (lowerTech.includes('python') || lowerTech.includes('c++')) return Terminal;
  if (lowerTech.includes('data') || lowerTech.includes('sql') || lowerTech.includes('mongo')) return Database;
  if (lowerTech.includes('node') || lowerTech.includes('server')) return Server;
  if (lowerTech.includes('ai') || lowerTech.includes('ml') || lowerTech.includes('torch')) return Cpu;
  if (lowerTech.includes('aero') || lowerTech.includes('flow')) return Wind;
  return Code; 
};

const ProjectModal = ({ project, onClose }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'ArrowRight') nextImage();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  if (!project) return null;

  const nextImage = (e) => {
    e?.stopPropagation();
    if (project.images?.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % project.images.length);
    }
  };

  const prevImage = (e) => {
    e?.stopPropagation();
    if (project.images?.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + project.images.length) % project.images.length);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <motion.div 
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white dark:bg-[#0F172A] w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:rounded-2xl overflow-hidden shadow-2xl relative flex flex-col border border-slate-200 dark:border-white/10"
        onClick={e => e.stopPropagation()} 
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-20 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
          aria-label="Close project details"
        >
          <X size={24} />
        </button>

        {/* IMAGE CAROUSEL - REDUCED HEIGHT */}
        <div className="relative h-48 sm:h-64 bg-gray-900 shrink-0 border-b border-slate-200 dark:border-white/10">
          {project.images && project.images.length > 0 ? (
            <>
              <motion.img 
                key={currentImageIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                src={project.images[currentImageIndex]} 
                alt={`${project.title} screenshot ${currentImageIndex + 1}`}
                className="w-full h-full object-cover"
              />
              
              {project.images.length > 1 && (
                <>
                  <button 
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-primary transition-colors"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button 
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-primary transition-colors"
                  >
                    <ChevronRight size={24} />
                  </button>
                  
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {project.images.map((_, idx) => (
                      <div 
                        key={idx}
                        className={`w-2 h-2 rounded-full transition-colors ${idx === currentImageIndex ? 'bg-primary' : 'bg-white/50'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500 bg-gray-800">
              No Image Available
            </div>
          )}
        </div>
        
        {/* CONTENT AREA */}
        <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-[#0F172A]">
          <div className="flex justify-between items-start mb-4">
            <span className="text-accent font-bold tracking-wider uppercase text-xs sm:text-sm px-3 py-1 bg-accent/10 rounded-full">
              {project.category}
            </span>
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-4 leading-tight">
            {project.title}
          </h2>
          
          <p className="text-slate-700 dark:text-white leading-relaxed mb-8 text-base sm:text-lg font-medium opacity-90">
            {project.longDescription || project.description}
          </p>

          {/* Tech Stack */}
          <div className="mb-8">
            <h4 className="text-sm font-bold text-slate-500 dark:text-primary uppercase tracking-wider mb-4">Technology Stack</h4>
            <div className="flex flex-wrap gap-3">
              {project.techStack?.map(tech => {
                const Icon = getTechIcon(tech);
                return (
                  <motion.div 
                    key={tech}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white text-sm rounded-lg shadow-sm"
                  >
                    <Icon size={16} className="text-primary" />
                    <span className="font-medium">{tech}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-200 dark:border-white/10">
             <a 
               href={project.links.github} 
               target="_blank" 
               rel="noreferrer" 
               className="flex justify-center items-center gap-2 px-6 py-3 bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 rounded-xl text-slate-900 dark:text-white font-bold transition-colors border border-slate-300 dark:border-white/10"
             >
                <Github size={20} /> View Source
             </a>
             <a 
               href={project.links.demo} 
               target="_blank" 
               rel="noreferrer" 
               className="flex justify-center items-center gap-2 px-6 py-3 bg-primary hover:bg-teal-400 rounded-xl text-black font-bold transition-all shadow-lg hover:shadow-primary/25"
             >
                <ExternalLink size={20} /> Live Deployment
             </a>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ProjectModal;