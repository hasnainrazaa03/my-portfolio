import { useState, useEffect, useRef } from 'react';

export const useActiveSection = (sectionIds) => {
  const [activeSection, setActiveSection] = useState('hero');
  // Use a ref to track the current section so the scroll handler never goes stale.
  const activeSectionRef = useRef(activeSection);

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

      if (foundSection && foundSection !== activeSectionRef.current) {
        activeSectionRef.current = foundSection;
        setActiveSection(foundSection);
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => window.removeEventListener('scroll', handleScroll);
  // sectionIds is the only real dependency; the ref avoids the stale-closure issue.
  }, [sectionIds]);

  return activeSection;
};
