import React from 'react';
import { motion } from 'framer-motion';
import { EXPERIENCE } from '../constants';
import SectionHeading from './ui/SectionHeading';
import TimelineItem from './TimelineItem';

const Experience = () => {
  return (
    <section id="experience" className="py-20 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <SectionHeading number="05" title="Flight Log" subtitle="Career trajectory and mission history" />

        <div className="relative">
          <div className="absolute left-4 md:left-1/2 transform md:-translate-x-1/2 top-0 bottom-0 w-[2px] bg-slate-200 dark:bg-white/10">
            <motion.div 
              className="absolute top-0 left-0 w-full bg-gradient-to-b from-primary via-blue-500 to-transparent"
              initial={{ height: "0%" }}
              whileInView={{ height: "100%" }}
              transition={{ duration: 1.5, ease: "linear" }}
              viewport={{ once: true }}
            />
          </div>

          <div className="space-y-2">
            {EXPERIENCE.map((exp, index) => (
              <TimelineItem key={exp.id} exp={exp} index={index} />
            ))}
          </div>
          
          <div className="absolute bottom-0 left-4 md:left-1/2 transform -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-primary rounded-full shadow-[0_0_15px_rgba(45,212,191,0.8)] z-10" />
        </div>

      </div>
    </section>
  );
};

export default Experience;