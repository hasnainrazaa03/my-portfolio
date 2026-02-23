import React from 'react';
import { motion } from 'framer-motion';

const SkillBar = ({ skill, index }) => {
  const getLevel = (level) => {
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
        <div className="w-8 h-8 rounded-lg bg-white p-1.5 flex items-center justify-center shadow-sm">
          {skill.image && (
            <img 
              src={skill.image} 
              alt={skill.name} 
              loading="lazy"
              className="w-full h-full object-contain"
              onError={(e) => e.target.style.display = 'none'}
            />
          )}
        </div>
        
        <span className="font-bold text-slate-700 dark:text-white text-sm">
          {skill.name}
        </span>
      </div>

      <div className="flex items-end gap-1 h-4" title={skill.level}>
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