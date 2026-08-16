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
        //
        // `primary` is THEME-AWARE. The brand teal #2DD4BF scores a superb
        // 11.1:1 on the dark background but only 1.78:1 on the light one —
        // far below the 4.5:1 WCAG AA floor, which made every `text-primary`
        // in light mode effectively unreadable. The variable resolves to
        // teal-700 (5.2:1) in light and the original teal in dark, so all ~40
        // usages become theme-appropriate without touching a single call site.
        // Values live in src/index.css.
        primary: "rgb(var(--color-primary) / <alpha-value>)",
        // Same story as `primary`: amber-500 reads beautifully on near-black
        // but only ~2.1:1 on white, and it is used as TEXT on a 10% tint of
        // itself (project category chips, education periods). Light mode gets
        // amber-700 (4.9:1). Values in src/index.css.
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        nebula: "#7042f8", // Purple for glowing effects
        'neon-500': '#7c3aed', // Purple-ish neon accent
        
        // Glass
        'glass-50': 'rgba(255,255,255,0.06)',
        'glass-900': 'rgba(2,6,23,0.6)',
        
        // Text
        light: "#F3F4F6", // Main text
        // NOTE: this is a FLAT colour, so it SHADOWS Tailwind's built-in gray
        // scale — `text-gray-300` and friends generate no CSS at all and fail
        // silently. Eleven such classes were dead in the codebase, which is why
        // several dark-mode elements were falling back to their light colour.
        // Use the `slate` scale for shades; `text-gray` (bare) uses this value.
        gray: "#9CA3AF", // Secondary text
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-slide': 'fadeSlideIn 0.3s ease-out',
        // Used by Hero3DFallback (the no-WebGL orbital visual).
        'spin-slower': 'spin 18s linear infinite',
        'spin-reverse-slow': 'spin 26s linear infinite reverse',
        'float-slow': 'floatSlow 6s ease-in-out infinite',
      },
      keyframes: {
        fadeSlideIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '50%': { transform: 'translateY(-10px)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    // Register an `hc:` variant that activates whenever the root element
    // carries the `hc` class. `useHighContrast()` toggles that class, so
    // any rule like `hc:bg-black hc:text-white` flips automatically.
    function ({ addVariant }) {
      addVariant('hc', ':where(.hc) &');
    },
  ],
}