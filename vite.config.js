import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { validateClientEnv } from './scripts/validateClientEnv.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Fails the build on VITE_ values that are present but structurally wrong —
    // notably a value copied from a secrets UI's masked display. See the module
    // header for why a presence check cannot catch that.
    // `loadEnv` merges .env files with prefix-matching process.env, so this
    // covers local builds and Vercel's injected vars alike.
    validateClientEnv((mode) => loadEnv(mode, process.cwd(), 'VITE_')),
  ],
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
