import { test, expect } from '@playwright/test';

/**
 * smoke.spec.ts — does the built app actually boot and render?
 *
 * The unit suite never mounts the whole app, so it could not have caught the
 * WebGL crash that blanked the entire page for anyone without hardware
 * acceleration: `new THREE.WebGLRenderer()` threw inside an effect, React
 * escalated it to the app-level ErrorBoundary, and the site rendered
 * "Something went wrong".
 */

test.describe('page boot', () => {
  test('renders the hero and every section landmark', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Everything below the fold is React.lazy behind Suspense, so the sections
    // do not exist until their chunks arrive. Locally that is instant and the
    // assertion passed by luck; against the live site it raced and flaked.
    // Drive the page to the bottom first so the lazy boundaries actually mount.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 800) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 100));
      }
    });

    for (const id of ['about', 'education', 'projects', 'github', 'experience', 'skills', 'achievements', 'contact']) {
      await expect(page.locator(`#${id}`), `#${id} never mounted`).toBeAttached({ timeout: 15_000 });
    }
  });

  test('never shows the error-boundary fallback', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // The exact copy the app-level ErrorBoundary renders.
    await expect(page.getByText('Something went wrong.')).toHaveCount(0);
    expect(consoleErrors.filter((e) => /ErrorBoundary/.test(e))).toEqual([]);
  });

  test('survives WebGL being unavailable', async ({ browser }) => {
    // The exact condition that took the site down: a context that cannot be
    // created. Hero3D must fall back rather than take the page with it.
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type: string, ...rest: unknown[]) {
        if (typeof type === 'string' && type.includes('webgl')) return null;
        // @ts-expect-error — passthrough for every other context type
        return original.call(this, type, ...rest);
      };
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('Something went wrong.')).toHaveCount(0);
    // The CSS orbital stands in for the 3D scene.
    await expect(page.getByRole('img', { name: /orbital/i })).toBeVisible();
    await context.close();
  });

  test('serves the WebP sibling for local raster images', async ({ page }) => {
    const requested: string[] = [];
    page.on('request', (r) => requested.push(r.url()));

    await page.goto('/');
    await page.locator('#skills').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200);

    // Every raster under public/ ships a .webp sibling; LazyImage offers it via
    // <picture>. If this regresses, the byte savings silently vanish.
    expect(requested.filter((u) => u.endsWith('.webp')).length).toBeGreaterThan(0);
  });
});
