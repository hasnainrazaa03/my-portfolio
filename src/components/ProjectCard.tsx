import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Maximize2, CheckCircle, Zap } from 'lucide-react';
import { scaleIn } from '../animations';
import LazyImage from './ui/LazyImage';
import type { Project } from '../types/content';

interface ProjectCardProps {
  project: Project;
  onClick: (project: Project) => void;
}

// Projects carry 8-18 technologies. Showing 3 made the overflow counter the
// loudest thing in the row ("+15 more"); 6 is a representative sample that
// still wraps to two tidy lines in the 3-column grid. The modal lists all of
// them, so nothing is lost — this is a display choice, not a data one.
const TECH_SHOWN = 6;

const ProjectCard = ({ project, onClick }: ProjectCardProps) => {
  const isInProgress = project.status === "In Progress";
  const thumbnail = project.images?.[0];
  // State-driven: hide the whole thumbnail wrapper if the image fails to load
  // (replaces a direct `e.target.parentElement.style.display` DOM mutation).
  const [thumbErrored, setThumbErrored] = useState(false);

  const extraTech = Math.max(0, (project.techStack?.length ?? 0) - TECH_SHOWN);

  return (
    // A real <button>, not a div with onClick. The cards were plain divs, so
    // the entire project catalogue — the thing a recruiter most wants to open —
    // was unreachable by keyboard and invisible to screen readers: the section
    // exposed only its filter and pagination controls. A button gets focus,
    // Enter/Space and the correct role for free, and ProjectModal already traps
    // focus and restores it here on close.
    <motion.button
      type="button"
      variants={scaleIn}
      onClick={() => onClick(project)}
      className="group w-full text-left rounded-2xl overflow-hidden h-full flex flex-col bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none hover:border-primary/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(45,212,191,0.1)] cursor-pointer hover:-translate-y-2"
    >
      {/* Thumbnail */}
      {thumbnail && !thumbErrored && (
        <div className="relative h-40 overflow-hidden bg-slate-200 dark:bg-white/5 shrink-0">
          <LazyImage
            src={thumbnail}
            alt={project.title}
            width={400}
            height={160}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={() => setThumbErrored(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      <div className="p-6 flex flex-col flex-1">
      <div className="flex justify-between items-start mb-4">
        <span className="text-xs font-bold text-accent uppercase tracking-wider px-2 py-1 bg-accent/10 rounded">
          {project.category}
        </span>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
            isInProgress 
              ? 'bg-yellow-400/20 text-yellow-800 dark:text-yellow-400 border border-yellow-400/30' 
              : 'bg-green-400/20 text-green-800 dark:text-green-400 border border-green-400/30'
          }`}>
            {isInProgress ? (
              <>
                <Zap size={12} />
                <span>In Progress</span>
              </>
            ) : (
              <>
                <CheckCircle size={12} />
                <span>Completed</span>
              </>
            )}
          </div>
          {/* Maximize, not ExternalLink: this opens a detail modal, it does
              not navigate away. The old glyph promised the wrong thing. */}
          <Maximize2
            size={16}
            aria-hidden="true"
            className="text-slate-500 dark:text-white group-hover:text-primary transition-colors"
          />
        </div>
      </div>
      
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-primary transition-colors line-clamp-2">
        {project.title}
      </h3>
      
      <p className="text-slate-600 dark:text-white text-sm mb-4 flex-1 line-clamp-3 font-medium opacity-90">
        {project.description}
      </p>
      
      <div className="flex flex-wrap gap-2 flex-none">
        {project.techStack?.slice(0, TECH_SHOWN).map(tag => (
          <span key={tag} className="px-2 py-0.5 bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-white/20 text-primary text-xs rounded-full font-semibold">
            {tag}
          </span>
        ))}
        {/* Reads as "there is more behind this card", not as stray text. */}
        {extraTech > 0 && (
          <span className="px-2 py-0.5 border border-dashed border-slate-300 dark:border-white/20 text-slate-500 dark:text-slate-400 text-xs rounded-full font-semibold">
            +{extraTech}
          </span>
        )}
      </div>

      {/* Announces what activating the card does. Visually hidden rather than an
          aria-label, because a label would REPLACE the accessible name and
          break WCAG 2.5.3 (Label in Name) against the card's own visible text. */}
      <span className="sr-only">View mission details for {project.title}</span>
      </div>
    </motion.button>
  );
};

export default ProjectCard;
