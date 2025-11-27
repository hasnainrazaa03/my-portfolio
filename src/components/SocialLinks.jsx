import React from 'react';
import { motion } from 'framer-motion';
import { Github, Linkedin, Instagram } from 'lucide-react'; // Changed Twitter to Instagram
import { PERSONAL_INFO } from '../constants';

const SocialLinks = ({ className = "" }) => {
  const socialIcons = [
    { name: 'GitHub', icon: Github, url: PERSONAL_INFO.socials.github },
    { name: 'LinkedIn', icon: Linkedin, url: PERSONAL_INFO.socials.linkedin },
    { name: 'Instagram', icon: Instagram, url: PERSONAL_INFO.socials.instagram }, // Updated mapping
  ];

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {socialIcons.map((social) => (
        <motion.a
          key={social.name}
          href={social.url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 bg-slate-200/50 dark:bg-white/5 rounded-full backdrop-blur-sm border border-slate-300 dark:border-white/10 text-slate-600 dark:text-gray-400 hover:text-primary hover:border-primary/50 transition-colors shadow-lg shadow-primary/5"
          whileHover={{ scale: 1.2, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          title={social.name}
          aria-label={social.name}
        >
          <social.icon size={20} strokeWidth={1.5} />
        </motion.a>
      ))}
    </div>
  );
};

export default SocialLinks;