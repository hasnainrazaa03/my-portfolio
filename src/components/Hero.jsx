import React, { useState, Suspense } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Link } from 'react-scroll';
import { Download, Check, ArrowRight, Loader2 } from 'lucide-react';
import { PERSONAL_INFO } from '../constants';
import { fadeInUp } from '../animations';
import SocialLinks from './SocialLinks';

// Lazy Load the Heavy 3D Component
const Hero3D = React.lazy(() => import('./Hero3D'));

const Hero = () => {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  
  const [isDownloaded, setIsDownloaded] = useState(false);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = '/resume.pdf'; 
    link.download = 'Hasnain_Raza_Resume.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setIsDownloaded(true);
    setTimeout(() => setIsDownloaded(false), 2000);
  };

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          
          {/* Text Content */}
          <motion.div 
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="space-y-6 relative z-20"
          >
            <span className="inline-block px-4 py-1 rounded-full bg-slate-200/50 dark:bg-white/10 border border-slate-300 dark:border-white/20 text-primary font-bold text-sm tracking-wide backdrop-blur-sm">
              Launch Sequence Initiated
            </span>
            
            <h1 className="text-5xl md:text-7xl font-bold text-slate-900 dark:text-white leading-tight">
              {PERSONAL_INFO.title.split('|')[0]} <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-purple-500">
                {PERSONAL_INFO.title.split('|')[1]}
              </span>
            </h1>

            {/* SPLIT TAGLINE AND BIO */}
            <div className="max-w-lg space-y-2">
              {/* Tagline (Static White/Gray) */}
              <p className="text-xl font-medium text-slate-600 dark:text-slate-300">
                {PERSONAL_INFO.tagline}
              </p>
              
              {/* Bio (Moving Gradient) */}
              <p className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-primary animate-gradient-x pb-1">
                {PERSONAL_INFO.bio.split('.')[0]}
              </p>
            </div>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <motion.button 
                onClick={handleDownload}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group relative flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-primary to-blue-600 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(45,212,191,0.3)] hover:shadow-[0_0_30px_rgba(45,212,191,0.5)] transition-all cursor-pointer w-full sm:w-auto"
                title="Download PDF (500KB)"
              >
                <div className="relative w-6 h-6">
                  <AnimatePresence mode='wait'>
                    {isDownloaded ? (
                      <motion.div
                        key="check"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute inset-0"
                      >
                        <Check size={24} />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="download"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute inset-0"
                      >
                        <Download size={24} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <span>{isDownloaded ? "Downloaded!" : "Download Resume"}</span>
              </motion.button>

              <Link 
                to="projects" 
                smooth={true} 
                className="group flex items-center justify-center gap-2 px-8 py-4 border border-slate-300 dark:border-white/30 text-slate-700 dark:text-white font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer backdrop-blur-sm w-full sm:w-auto"
              >
                View Mission Log
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            
            <div className="pt-6">
              <SocialLinks />
            </div>
          </motion.div>

          {/* 3D Visual Side */}
          <motion.div 
            style={{ y: y1 }} 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="hidden md:block relative h-[600px] w-full"
          >
             <Suspense fallback={
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="animate-spin text-primary" size={40} />
                </div>
             }>
                <Hero3D />
             </Suspense>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;