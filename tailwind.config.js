/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Deep Space Backgrounds
        space: "#030014", // The main background (very deep purple/black)
        secondary: "#0F172A", // Lighter panels
        
        // Accents
        primary: "#2DD4BF", // Teal/Cyan (HUD/Cockpit color)
        accent: "#F59E0B", // Amber/Gold (Stars/Engines)
        nebula: "#7042f8", // Purple for glowing effects
        'neon-500': '#7c3aed', // Purple-ish neon accent
        
        // Glass
        'glass-50': 'rgba(255,255,255,0.06)',
        'glass-900': 'rgba(2,6,23,0.6)',
        
        // Text
        light: "#F3F4F6", // Main text
        gray: "#9CA3AF", // Secondary text
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-slide': 'fadeSlideIn 0.3s ease-out',
      },
      keyframes: {
        fadeSlideIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}