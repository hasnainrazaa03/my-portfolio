import React from 'react';
import { motion } from 'framer-motion';
import { SKILLS } from '../constants';
import SkillBar from './SkillBar';
import SectionHeading from './ui/SectionHeading';
import ContentIcon from './ui/ContentIcon';

const Skills = () => (
  <section id="skills" className="py-20 relative">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <SectionHeading number="06" title="Tech Systems" subtitle="Proficiency metrics across domains" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {SKILLS.map((skillGroup, groupIdx) => (
          <motion.div 
            key={skillGroup.category}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: groupIdx * 0.1 }}
            className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-primary/10 rounded-lg text-primary">
                <ContentIcon name={skillGroup.icon} size={20} />
              </div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">{skillGroup.category}</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {skillGroup.items.map((skill, itemIdx) => (
                <SkillBar key={skill.name} skill={skill} index={itemIdx} />
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Skills;