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
          github: ['react-github-calendar'],
          // `@supabase/supabase-js` is deliberately NOT listed: it is only
          // imported by the serverless handler in api/analytics.ts, never by
          // client code, so naming it here just emitted an empty 0-byte chunk.
        },
      },
    },
  },
})
