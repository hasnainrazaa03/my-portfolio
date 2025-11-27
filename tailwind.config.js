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
      }
    },
  },
  plugins: [],
}