import { test, expect } from '@playwright/test';

/**
 * motion.spec.ts — every test here runs with `prefers-reduced-motion: reduce`.
 *
 * The emulation is applied with `page.emulateMedia()` rather than the
 * `reducedMotion` project/`test.use` option: that option was verified to be
 * silently ignored on this Playwright build (matchMedia still reported false),
 * which would have made these assertions pass against a page that was still
 * animating. The first assertion below therefore checks the emulation itself.
 *
 * The whole motion system hangs off one `<MotionConfig reducedMotion="user">`.
 * The failure mode to guard against is not "animation still plays" but the
 * subtler one: motion suppressed AND content left at opacity 0, which hides the
 * page from exactly the people who asked for less movement.
 */

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('the reduced-motion emulation is actually in effect', async ({ page }) => {
  // Guards the guard: if this ever reports false, every other test in this file
  // is passing for the wrong reason.
  await page.goto('/');
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
});

test('content is fully visible with motion reduced', async ({ page }) => {
  await page.goto('/');

  for (const id of ['about', 'projects', 'skills', 'achievements']) {
    const section = page.locator(`#${id}`);
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);

    const opacities = await section
      .locator('h2, h3, p')
      .evaluateAll((els) => els.slice(0, 6).map((el) => Number(getComputedStyle(el).opacity)));

    expect(opacities.length, `#${id} rendered no text`).toBeGreaterThan(0);
    for (const o of opacities) {
      // Reduced motion must not leave content faded out.
      expect(o, `#${id} has text stuck below full opacity`).toBeGreaterThan(0.85);
    }
  }
});

test('smooth scrolling is disabled', async ({ page }) => {
  await page.goto('/');
  // CSS smooth-scroll is opt-OUT, so it must be declared only inside a
  // `no-preference` query — otherwise it applies here too.
  const behavior = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
  expect(behavior).toBe('auto');
});

test('transform animations are suppressed on scroll reveal', async ({ page }) => {
  await page.goto('/');

  const section = page.locator('#achievements');
  await section.scrollIntoViewIfNeeded();
  // Sample immediately, while a reveal would still be mid-flight.
  await page.waitForTimeout(100);

  const transformed = await section
    .locator('.group')
    .evaluateAll((els) =>
      els.slice(0, 3).filter((el) => {
        const t = getComputedStyle(el).transform;
        return t && t !== 'none';
      }).length,
    );

  expect(transformed, 'cards are still being moved despite reduced motion').toBe(0);
});
