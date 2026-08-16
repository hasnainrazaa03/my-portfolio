import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E — closes the "Add Playwright E2E" item that had been open in
 * the audit checklist.
 *
 * WHY IT MATTERS HERE SPECIFICALLY: several checklist items were marked done
 * while being broken in production. Every serverless endpoint returned
 * FUNCTION_INVOCATION_FAILED for an extended period because Node ESM cannot
 * resolve extensionless imports, and nobody noticed — the unit suite passed
 * (it never boots the app), and the client fails soft, so the UI looked fine
 * while the API was dead. These specs exercise the built app in a real browser,
 * which is the only layer that would have caught it.
 *
 * `webServer` serves `dist/`, so this tests the BUILT output rather than the
 * dev server — the thing that actually ships.
 *
 * NOTE: reduced motion is emulated per-spec via `page.emulateMedia()`, not with
 * a `reducedMotion` project option. The context-level option was verified to be
 * silently ignored on this Playwright/Chromium build — `matchMedia` still
 * reported `false` — which would have made the motion specs pass vacuously.
 */
export default defineConfig({
  testDir: './e2e',
  // Fail the run if a test was accidentally left focused.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],

  use: {
    // `localhost`, not 127.0.0.1: vite preview binds to localhost, which
    // resolves to ::1 here, so the IPv4 literal never answers.
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run preview -- --port 4173 --strictPort',
        url: 'http://localhost:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
