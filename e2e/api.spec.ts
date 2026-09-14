import { test, expect } from './fixtures';

/**
 * Every serverless function loads and answers — without spending anything.
 *
 * Production once returned FUNCTION_INVOCATION_FAILED from every endpoint for
 * an extended period: extensionless ESM imports failed at module load, before
 * any handler code ran, and the client's graceful fallbacks hid it completely.
 *
 * Each request below takes a path that runs AFTER the module and its imports
 * load but BEFORE any model call, database write or rate-limited work: a
 * malformed body, a too-short posting, a missing token, a wrong method. A 500
 * here means the function cannot load; the expected 4xx means it can.
 *
 * Production only: `vite preview` has no serverless functions.
 */
test.describe('serverless functions load', () => {
  test.skip(!process.env.E2E_BASE_URL, 'vite preview serves no /api');

  test('health reports the deployed commit', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body).toHaveProperty('commit');
  });

  test('chat rejects a malformed body with 400, not 500', async ({ request }) => {
    const res = await request.post('/api/chat', {
      headers: { 'Content-Type': 'application/json' },
      data: '{',
    });
    expect(res.status()).toBe(400);
  });

  test('fit rejects a too-short posting before any model call', async ({ request }) => {
    const res = await request.post('/api/fit', { data: { jd: 'too short' } });
    expect(res.status()).toBe(400);
  });

  test('analytics refuses a request with no token', async ({ request }) => {
    expect((await request.get('/api/analytics')).status()).toBe(401);
  });

  test('github activity proxy answers', async ({ request }) => {
    const res = await request.get('/api/github');
    expect([200, 429]).toContain(res.status()); // 429 is its own limiter, still a loaded function
  });

  test('csp-report loads (and refuses GET)', async ({ request }) => {
    expect((await request.get('/api/csp-report')).status()).toBe(405);
  });
});
