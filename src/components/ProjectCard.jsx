import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { scaleIn } from '../animations';

const ProjectCard = ({ project, onClick }) => {
  return (
    <motion.div 
      variants={scaleIn}
      onClick={() => onClick(project)}
      // GLOW CARD STYLE APPLIED
      className="group rounded-2xl overflow-hidden p-6 h-full flex flex-col bg-slate-50/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-primary/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(45,212,191,0.1)] cursor-pointer hover:-translate-y-2"
    >
      <div className="flex justify-between items-start mb-4">
        <span className="text-xs font-bold text-accent uppercase tracking-wider px-2 py-1 bg-accent/10 rounded">
          {project.category}
        </span>
        <ExternalLink size={16} className="text-slate-400 dark:text-white group-hover:text-primary transition-colors" />
      </div>
      
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-primary transition-colors">
        {project.title}
      </h3>
      
      <p className="text-slate-600 dark:text-white text-sm mb-4 flex-grow line-clamp-3 font-medium opacity-90">
        {project.description}
      </p>
      
      <div className="flex flex-wrap gap-2 mt-auto">
        {project.techStack?.slice(0, 3).map(tag => (
          <span key={tag} className="px-3 py-1 bg-slate-200 dark:bg-white/10 border border-slate-300 dark:border-white/20 text-primary text-xs rounded-full font-semibold">
            {tag}
          </span>
        ))}
      </div>
    </motion.div>
  );
};

export default ProjectCard;