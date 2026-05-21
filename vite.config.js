import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // PERF: split heavyweight vendor libs into their own chunks so they can
    // cache independently of app code and don't bloat the initial bundle.
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          motion: ['framer-motion'],
          supabase: ['@supabase/supabase-js'],
          github: ['react-github-calendar'],
        },
      },
    },
  },
})
