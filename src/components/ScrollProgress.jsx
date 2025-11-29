import React from 'react';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { Rocket } from 'lucide-react';

const ScrollProgress = () => {
  const { scrollYProgress } = useScroll();

  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const xPosition = useTransform(scaleX, (value) => `calc(${value * 100}% - 2px)`);

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/20 via-primary to-accent origin-left z-[100]"
        style={{ scaleX }}
      />

      <motion.div
        className="fixed top-[-6px] z-[100] pointer-events-none"
        style={{ left: xPosition }}
      >
        <div className="relative">
          
          <div className="relative z-10 transform rotate-45">
            <Rocket 
              size={20} 
              className="text-accent fill-primary drop-shadow-[0_0_8px_rgba(45,212,191,0.8)]" 
              strokeWidth={2.5}
            />
          </div>

          <div className="absolute top-[6px] right-[14px] w-6 h-1.5 bg-gradient-to-l from-transparent via-orange-500 to-yellow-300 rounded-full blur-[1px] animate-rocket-fire origin-right" />
          
          <div className="absolute top-[8px] right-[14px] w-3 h-0.5 bg-white rounded-full blur-[0.5px] animate-rocket-pulse" />
          
          <div className="absolute top-[7px] right-[12px] w-8 h-1 bg-blue-500/50 rounded-full blur-sm -z-10" />

        </div>
      </motion.div>
    </>
  );
};

export default ScrollProgress;