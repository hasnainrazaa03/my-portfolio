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
        'src/services/**/*.{js,ts}',
        'src/hooks/**/*.{js,ts}',
        'src/utils/**/*.{js,ts}',
        'src/data/**/*.{js,ts}',
        'src/config/**/*.{js,ts}',
        'api/_lib/**/*.{js,ts}',
      ],
      exclude: [
        '**/__tests__/**',
        '**/*.test.{js,jsx}',
      ],
      // Ratcheted thresholds (Phase 4 / T4.4). We deliberately keep components
      // OUT of `include` — UI smoke tests give misleading line-coverage signal.
      // These cover the logic layer (services, hooks, utils, data, config,
      // api/_lib). Raise further as coverage grows; CI catches regressions.
      thresholds: {
        lines: 55,
        functions: 50,
        statements: 55,
        branches: 45,
      },
    },
  },
});
