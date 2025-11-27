import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Calendar, MapPin } from 'lucide-react';

const TimelineItem = ({ exp, index }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isEven = index % 2 === 0;

  return (
    <div 
      className={`relative flex items-center justify-between md:justify-normal w-full mb-12 ${
        isEven ? "md:flex-row-reverse" : ""
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setIsHovered(!isHovered)}
    >
      {/* Spacer for Desktop Layout */}
      <div className="hidden md:block w-5/12" />

      {/* CENTER LOGO NODE - UPDATED SIZE */}
      <div className="absolute left-4 md:left-1/2 transform -translate-x-1/2 flex items-center justify-center z-10">
        <motion.div 
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          // Changed w-16 h-16 to w-20 h-20 (80px) and increased padding to p-4
          className="w-20 h-20 rounded-full bg-white dark:bg-[#0F172A] border-2 border-slate-200 dark:border-primary/30 shadow-[0_0_0_4px_rgba(255,255,255,0.1)] dark:shadow-[0_0_0_4px_rgba(45,212,191,0.1)] flex items-center justify-center overflow-hidden p-4 group-hover:scale-110 transition-transform duration-300"
        >
          {exp.logo ? (
            <img 
              src={exp.logo} 
              alt={exp.company} 
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="font-bold text-primary text-xs">{exp.company.substring(0, 2)}</span>
          )}
        </motion.div>
      </div>

      {/* CONTENT CARD */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        className={`w-[calc(100%-60px)] md:w-5/12 ml-16 md:ml-0 p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:border-primary/40 dark:hover:border-primary/40 shadow-lg hover:shadow-xl dark:shadow-none hover:shadow-primary/5 backdrop-blur-sm transition-all duration-300 cursor-pointer relative group ${
          isEven ? "md:mr-auto" : "md:ml-auto"
        }`}
      >
        {/* Connector Line */}
        <div className={`hidden md:block absolute top-6 w-8 h-[2px] bg-primary/30 group-hover:bg-primary/80 transition-colors ${
          isEven ? "-right-8" : "-left-8"
        }`} />

        {/* Card Header */}
        <div className="flex flex-col gap-1 mb-3">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
              {exp.role}
            </h3>
          </div>
          
          <div className="flex flex-wrap gap-y-2 justify-between items-center text-sm">
            <span className="font-bold text-primary tracking-wide">
              {exp.company}
            </span>
            
            <div className="flex items-center gap-3">
              {/* Location Tag */}
              {exp.location && (
                <div className="flex items-center gap-1 text-slate-500 dark:text-gray-300 text-xs">
                  <MapPin size={12} className="text-primary" />
                  {exp.location}
                </div>
              )}
              
              {/* Date Tag */}
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-gray-300 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md font-mono text-xs">
                <Calendar size={12} />
                {exp.period}
              </div>
            </div>
          </div>
        </div>
        
        {/* Expandable Description */}
        <motion.div
          initial={false}
          animate={{ 
            height: isHovered ? "auto" : "0px",
            opacity: isHovered ? 1 : 0,
            marginBottom: isHovered ? "10px" : "0px"
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className="pt-3 border-t border-slate-200 dark:border-white/10 mt-2">
            <ul className="space-y-2">
              {exp.description.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-white leading-relaxed">
                  <span className="mt-1.5 min-w-[6px] h-[6px] rounded-full bg-primary shrink-0" />
                  <span className="opacity-90 font-medium">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
        
        {/* Hint Text */}
        {!isHovered && (
           <div className="md:hidden flex items-center gap-1 text-xs text-slate-400 mt-2 italic">
             Tap to reveal details <ChevronRight size={12} />
           </div>
        )}
      </motion.div>
    </div>
  );
};

export default TimelineItem;