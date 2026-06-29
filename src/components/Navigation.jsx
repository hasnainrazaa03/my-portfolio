import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Rocket, Sun, Moon, Contrast } from 'lucide-react';
import { useHighContrast } from '../hooks/useHighContrast';
import { PERSONAL_INFO } from '../constants';
import { useActiveSection } from '../hooks/useActiveSection';
import { scrollToSection } from '../utils/scroll';

const Navigation = ({ isDark, toggleTheme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hc, , toggleHc] = useHighContrast();

  const navLinks = [
    { name: "About", id: "about" },
    { name: "Education", id: "education" },
    { name: "Projects", id: "projects" },
    { name: "GitHub", id: "github" },
    { name: "Experience", id: "experience" },
    { name: "Skills", id: "skills" },
    { name: "Awards", id: "achievements" },
    { name: "Contact", id: "contact" }
  ];

  const activeSection = useActiveSection(navLinks.map(link => link.id));

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 dark:bg-[#030014]/80 backdrop-blur-md shadow-lg border-b border-gray-200 dark:border-white/10 py-4' : 'bg-transparent py-6'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <button
          type="button"
          onClick={() => scrollToSection('hero')}
          className="text-2xl font-bold text-primary tracking-tighter flex items-center gap-2 cursor-pointer z-50 bg-transparent"
          aria-label="Scroll to top"
        >
          <Rocket size={24} className="text-accent transform -rotate-45" />
          <span>{PERSONAL_INFO.name.split(' ')[0]}<span className="text-accent">.</span></span>
        </button>

        <div className="hidden md:flex items-center space-x-1">
          {navLinks.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToSection(item.id)}
              aria-current={activeSection === item.id ? 'page' : undefined}
              className={`relative px-4 py-2 text-sm font-medium cursor-pointer transition-colors duration-300 bg-transparent ${activeSection === item.id ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`}
            >
              {activeSection === item.id && (
                <motion.span
                  layoutId="activeTab"
                  className="absolute inset-0 bg-slate-200/50 dark:bg-white/10 rounded-full -z-10 backdrop-blur-sm"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              {item.name}
            </button>
          ))}
          
          <button 
            onClick={toggleTheme}
            className="ml-4 p-2 rounded-full bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-yellow-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            aria-label="Toggle Dark Mode"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button 
            onClick={toggleHc}
            className={`ml-2 p-2 rounded-full transition-colors ${hc ? 'bg-primary text-black' : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10'}`}
            aria-label="Toggle high-contrast mode"
            aria-pressed={hc}
            title={hc ? 'High-contrast on' : 'High-contrast off'}
          >
            <Contrast size={20} />
          </button>
        </div>

        <div className="md:hidden flex items-center gap-4 z-50">
          <button 
            onClick={toggleHc}
            className={`p-2 rounded-full ${hc ? 'bg-primary text-black' : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200'}`}
            aria-label="Toggle high-contrast mode"
            aria-pressed={hc}
          >
            <Contrast size={20} />
          </button>
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-yellow-400"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          <button onClick={() => setIsOpen(!isOpen)} className="text-slate-900 dark:text-white focus:outline-none" aria-expanded={isOpen} aria-label="Toggle navigation menu">
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white dark:bg-[#0F172A] border-t border-gray-200 dark:border-gray-800 overflow-hidden shadow-xl"
          >
            <div className="px-4 pt-2 pb-6 space-y-1">
              {navLinks.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { scrollToSection(item.id); setIsOpen(false); }}
                  aria-current={activeSection === item.id ? 'page' : undefined}
                  className={`block w-full text-left px-3 py-3 text-base font-medium rounded-md transition-colors bg-transparent ${
                    activeSection === item.id 
                      ? 'bg-primary/10 text-primary border-l-4 border-primary' 
                      : 'text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navigation;