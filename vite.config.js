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
        /**
         * FUNCTION form, deliberately — not the object form.
         *
         * The object form (`{ github: ['react-github-calendar'] }`) assigns a
         * package *and its whole dependency subtree* to the chunk. React is a
         * dependency of react-github-calendar, so React was swallowed into the
         * `github` chunk. Every eager module then had to import that chunk to
         * get React, which dragged the calendar library onto the critical path
         * and made index.html modulepreload it — defeating the `lazy()` on
         * GitHubSection entirely.
         *
         * The function form is asked about one module at a time, so a package
         * lands in its own chunk and shared dependencies stay shared.
         *
         * `@supabase/supabase-js` is deliberately absent: it is imported only
         * by the serverless handler in api/analytics.ts, never by client code,
         * so naming it here just emitted an empty 0-byte chunk.
         */
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          // Order matters: react-dom must be tested before the bare `react/`
          // match, and react-github-calendar before either.
          if (/node_modules\/three\//.test(id)) return 'three';
          if (/node_modules\/framer-motion\//.test(id)) return 'motion';
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react';
          // react-github-calendar is deliberately NOT named here. Its only
          // importer is GitHubSection, which is already `lazy()`, so Vite's
          // default splitting folds it into that lazy chunk — exactly what we
          // want. Naming it created a chunk that also absorbed Vite's shared
          // `__vitePreload` helper; every lazy chunk imports that helper, so
          // the chunk became eager and took the calendar onto the critical
          // path with it.
        },
      },
    },
  },
})
