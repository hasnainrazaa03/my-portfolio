import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, ExternalLink } from 'lucide-react';
import { EDUCATION } from '../constants';

const Education = () => (
  <section id="education" className="py-20 relative">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-12 text-center"><span className="text-primary">02.</span> Education</h2>
      
      <div className="grid md:grid-cols-3 gap-8"> 
        {EDUCATION?.map((edu, index) => (
          <motion.div 
            key={edu.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            // Updated classes: added transform-gpu and explicitly set background colors on hover to override glass-panel defaults
            className="p-8 rounded-2xl relative overflow-hidden group transition-all duration-300 flex flex-col h-full bg-slate-50/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-primary/50 shadow-lg hover:shadow-2xl hover:shadow-primary/10 transform-gpu hover:-translate-y-2"
          >
            {/* Header: Logo & Year */}
            <div className="flex justify-between items-start mb-6">
              {/* Logo Box */}
              <a 
                href={edu.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-16 h-16 p-3 bg-white rounded-xl shadow-sm flex items-center justify-center overflow-hidden cursor-pointer hover:scale-110 hover:shadow-md transition-all duration-300 relative z-20"
                title={`Visit ${edu.school}`}
              >
                {edu.image ? (
                  <img 
                    src={edu.image} 
                    alt={`${edu.school} logo`} 
                    className="w-full h-full object-contain"
                    onError={(e) => { e.target.style.display = 'none'; }} 
                  />
                ) : (
                  <BookOpen size={32} className="text-primary" />
                )}
                
                <div className="absolute inset-0 bg-black/10 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                  <ExternalLink size={16} className="text-black/70" />
                </div>
              </a>
              
              {/* Period Badge */}
              <span className="text-accent font-mono text-xs border border-accent/20 px-2 py-1 rounded bg-accent/5">
                {edu.period}
              </span>
            </div>

            <div className="relative z-10 flex flex-col h-full">
              {/* Degree & School */}
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1 leading-tight">
                {edu.degree}
              </h3>
              <h4 className="text-primary font-bold text-sm mb-4">
                {edu.school}
              </h4>

              {/* GPA Badge */}
              {edu.gpa && (
                <div className="mb-6">
                  <span className="text-xs font-bold text-slate-700 dark:text-white bg-slate-200 dark:bg-white/10 px-3 py-1 rounded-full border border-slate-300 dark:border-white/10">
                    GPA: {edu.gpa}
                  </span>
                </div>
              )}

              {/* Coursework Section */}
              <div className="mt-auto pt-4 border-t border-slate-200 dark:border-white/10">
                <h5 className="text-xs font-bold text-slate-500 dark:text-primary uppercase tracking-wider mb-2">
                  Coursework
                </h5>
                <p className="text-sm text-slate-700 dark:text-white font-medium leading-relaxed">
                  {edu.coursework}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Education;