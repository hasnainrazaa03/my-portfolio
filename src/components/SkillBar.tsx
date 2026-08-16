import React from 'react';
import { motion } from 'framer-motion';
import LazyImage from './ui/LazyImage';
import ContentIcon from './ui/ContentIcon';
import type { SkillItem } from '../types/content';

interface SkillBarProps {
  skill: SkillItem;
  index: number;
}

const SkillBar = ({ skill, index }: SkillBarProps) => {
  const getLevel = (level: string) => {
    switch (level) {
      case "Expert": return 4;
      case "Intermediate": return 3;
      case "Beginner": return 2;
      default: return 3;
    }
  };

  const levelStrength = getLevel(skill.level);

  return (
    <motion.div 
      className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-primary/50 hover:bg-slate-200 dark:hover:bg-white/10 transition-all group"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
    >
      <div className="flex items-center gap-3">
        {/* A skill shows either a real product logo or, for abstract concepts
            with no logo, a Lucide glyph. The logo tile keeps its white plate so
            multi-colour logos stay legible on both themes; the icon tile uses
            the accent treatment instead of sitting on an odd white square. */}
        {skill.icon ? (
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center ring-1 ring-primary/20">
            <ContentIcon name={skill.icon} size={17} aria-hidden="true" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-white p-1.5 flex items-center justify-center shadow-sm">
            <LazyImage
              src={skill.image}
              alt={skill.name}
              width={20}
              height={20}
              className="w-full h-full object-contain"
            />
          </div>
        )}

        <span className="font-bold text-slate-700 dark:text-white text-sm">
          {skill.name}
        </span>
      </div>

      <div
        className="flex items-end gap-1 h-4"
        title={skill.level}
        role="progressbar"
        aria-label={`${skill.name} proficiency: ${skill.level}`}
        aria-valuenow={levelStrength}
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuetext={skill.level}
      >
        {[1, 2, 3, 4].map((bar) => (
          <motion.div
            key={bar}
            initial={{ height: 4, opacity: 0.3 }}
            whileInView={{ 
              height: bar * 4, 
              opacity: bar <= levelStrength ? 1 : 0.2,
              backgroundColor: bar <= levelStrength ? '#2DD4BF' : 'currentColor'
            }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.05 + (bar * 0.1) }}
            className={`w-1 rounded-sm dark:text-white text-slate-400`}
          />
        ))}
      </div>
    </motion.div>
  );
};

export default SkillBar;