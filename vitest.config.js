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
      // Conservative starter thresholds — raise as coverage grows.
      thresholds: {
        lines: 60,
        functions: 60,
        statements: 60,
        branches: 50,
      },
    },
  },
});
