import { test as base, expect } from '@playwright/test';

/**
 * fixtures.ts — the `test` every spec imports, with two protections that
 * matter once the suite runs against PRODUCTION every day.
 *
 * 1. NO ANALYTICS. Vercel Analytics counts every page load. The suite makes
 *    dozens a run; on a personal site that is a meaningful share of all
 *    "visitors", every day, forever. Its beacon is blocked here.
 *
 * 2. NO UNMOCKED MODEL CALLS. /api/chat and /api/fit cost money, spend the
 *    rate limit, and /api/chat writes each exchange to the analytics table
 *    that the visitor-insights view charts — a daily fake question would sit
 *    in the data as if a recruiter had asked it. Any request to either that a
 *    test has not mocked is aborted and fails the test.
 *
 * Routes registered here run LAST: Playwright gives later registrations
 * priority, so a test's own `page.route('**\/api/chat', …)` mock still wins.
 */
const PAID_APIS = /\/api\/(chat|fit)(\?|$)/;

export const test = base.extend<{ productionGuards: void }>({
  productionGuards: [
    async ({ page }, use, testInfo) => {
      const unmocked: string[] = [];

      await page.route('**/_vercel/insights/**', (route) => route.abort());
      await page.route('**/_vercel/speed-insights/**', (route) => route.abort());
      await page.route(PAID_APIS, (route) => {
        unmocked.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`);
        return route.abort();
      });

      await use();

      expect(
        unmocked,
        `"${testInfo.title}" called a paid API without mocking it: ${unmocked.join(', ')}. ` +
          'Mock it with page.route — the suite runs against production daily.',
      ).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
