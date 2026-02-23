import { useEffect } from 'react';
import { useActiveSection } from '../hooks/useActiveSection';

const SECTIONS = ['hero', 'about', 'education', 'projects', 'github', 'experience', 'skills', 'contact'];

// Moved to module scope — this object is static and should not be re-created on every render.
const TITLES = {
  'hero': 'Hasnain Raza | Portfolio',
  'about': 'About Me | Hasnain Raza',
  'education': 'Education | USC & RVCE',
  'projects': 'Missions | AI & Dev',
  'github': 'Open Source | Activity',
  'experience': 'Flight Log | Experience',
  'skills': 'System Specs | Skills',
  'contact': 'Contact | Open Frequencies'
};

const PageTitleUpdater = () => {
  const activeSection = useActiveSection(SECTIONS);

  useEffect(() => {
    const newTitle = TITLES[activeSection] || 'Hasnain Raza | Portfolio';
    document.title = newTitle;
  }, [activeSection]);

  return null;
};

export default PageTitleUpdater;