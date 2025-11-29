import React, { useEffect, useRef } from 'react';
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion';

const StatCounter = ({ stat, index }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  
  const motionValue = useMotionValue(0);
  
  const springValue = useSpring(motionValue, {
    damping: 30,
    stiffness: 100,
    duration: 2
  });

  useEffect(() => {
    if (isInView) {
      motionValue.set(stat.target);
    }
  }, [isInView, stat.target, motionValue]);

  useEffect(() => {
    springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = latest.toFixed(0);
      }
    });
  }, [springValue]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ y: -5 }}
      className="relative flex flex-col items-center justify-center p-6 bg-slate-50/50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 hover:border-primary/50 transition-all duration-300 group shadow-lg dark:shadow-none hover:shadow-[0_0_30px_rgba(45,212,191,0.15)]"
    >
      <div className="mb-4 p-3 bg-white dark:bg-white/10 rounded-xl text-primary shadow-sm ring-1 ring-black/5 dark:ring-white/10 group-hover:scale-110 transition-transform duration-300 relative z-10">
        <stat.icon size={28} />
      </div>
      
      <div className="flex items-baseline gap-1 font-bold relative z-10">
        <span 
          className="text-4xl md:text-5xl tracking-tight text-slate-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-b dark:from-white dark:to-slate-400 drop-shadow-sm" 
          ref={ref}
        >
          0
        </span>
        <span className="text-2xl md:text-3xl text-primary font-bold">{stat.suffix}</span>
      </div>
      
      <span className="mt-2 text-sm font-bold text-slate-600 dark:text-primary/90 uppercase tracking-widest relative z-10">
        {stat.label}
      </span>
    </motion.div>
  );
};

export default StatCounter;