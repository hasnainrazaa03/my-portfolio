import React from 'react';
import { motion } from 'framer-motion';
import { PERSONAL_INFO, STATS } from '../constants';
import { fadeInUp } from '../animations';
import StatCounter from './StatCounter';

const About = () => (
  <section id="about" className="py-20 relative">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
      <motion.div 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeInUp}
        className="text-center mb-16"
      >
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-10"><span className="text-primary">01.</span> About Me</h2>
        
        {/* Bio Card - Updated Styling */}
        <div className="p-8 md:p-10 rounded-2xl shadow-xl max-w-4xl mx-auto mb-16 bg-slate-50/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-primary/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(45,212,191,0.1)]">
          
          {/* The Headline */}
          <p className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 mb-8 leading-relaxed tracking-tight">
            {PERSONAL_INFO.bioHeadline}
          </p>

          {/* The Story */}
          <p className="text-lg text-slate-700 dark:text-slate-200 leading-loose font-medium opacity-90">
            {PERSONAL_INFO.bioStory}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((stat, index) => (
            <StatCounter key={index} stat={stat} index={index} />
          ))}
        </div>

      </motion.div>
    </div>
  </section>
);

export default About;