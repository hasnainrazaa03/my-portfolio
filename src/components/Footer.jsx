import React from 'react';
import { PERSONAL_INFO } from '../constants';
import SocialLinks from './SocialLinks';

const Footer = () => (
  <footer className="bg-transparent py-8 border-t border-white/10">
    <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-6">
      <SocialLinks />
      <div className="text-center text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} {PERSONAL_INFO.name}. Designed in the cosmos.</p>
      </div>
    </div>
  </footer>
);

export default Footer;