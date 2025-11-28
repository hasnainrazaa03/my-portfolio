import { useState, useEffect } from 'react';

export const useActiveSection = (sectionIds) => {
  const [activeSection, setActiveSection] = useState('hero');

  useEffect(() => {
    const handleScroll = () => {
      const spyLine = window.innerHeight * 0.3;
      let foundSection = '';

      for (const id of sectionIds) {
        const element = document.getElementById(id);
        if (element) {
          const rect = element.getBoundingClientRect();
          
          if (rect.top <= spyLine && rect.bottom > spyLine) {
            foundSection = id;
            break;
          }
        }
      }

      if (foundSection && foundSection !== activeSection) {
        setActiveSection(foundSection);
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return activeSection;
};
