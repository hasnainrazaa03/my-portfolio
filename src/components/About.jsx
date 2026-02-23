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
        
        {/* Portrait — circular avatar with glow accent */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
          className="relative group mx-auto mb-12 w-36 h-36 md:w-48 md:h-48"
        >
          {/* Decorative glow ring behind the avatar */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 via-neon-500/20 to-primary/10 blur-md scale-110 -z-10 opacity-60 group-hover:opacity-100 group-hover:scale-[1.15] transition-all duration-500" aria-hidden="true" />

          <div className="rounded-full overflow-hidden w-full h-full ring-2 ring-white/10 group-hover:ring-neon-500/30 transition-all duration-300 shadow-xl">
            <img
              src="/me.jpg"
              alt="Hasnain Raza"
              className="w-full h-full object-cover rounded-full"
              onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.classList.add('bg-primary/20'); }}
            />
          </div>
        </motion.div>

        <div className="p-8 md:p-10 rounded-2xl shadow-xl max-w-4xl mx-auto mb-16 bg-slate-50/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-primary/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(45,212,191,0.1)]">
          
          <p className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 mb-8 leading-relaxed tracking-tight">
            {PERSONAL_INFO.bioHeadline}
          </p>

          <p className="text-lg text-slate-700 dark:text-slate-200 leading-loose font-medium opacity-90">
            {PERSONAL_INFO.bioStory}
          </p>
        </div>

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