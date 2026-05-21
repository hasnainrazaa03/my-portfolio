import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/__tests__/**/*.test.{js,jsx}'],
    setupFiles: ['./src/__tests__/setup.js'],
    coverage: {
      // v8 ships with vitest 4; no extra dep needed.
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: [
        'src/services/**/*.js',
        'src/hooks/**/*.js',
        'api/_lib/**/*.js',
      ],
      exclude: [
        '**/__tests__/**',
        '**/*.test.{js,jsx}',
      ],
      // Baseline thresholds. These reflect what's actually tested today
      // (api/_lib helpers, chatService, speech-recognition hook). We
      // intentionally do NOT include components in `include` because UI
      // smoke tests give misleading line-coverage signal. Raise these as
      // service / hook coverage grows; CI will catch regressions.
      thresholds: {
        lines: 35,
        functions: 30,
        statements: 35,
        branches: 40,
      },
    },
  },
});
