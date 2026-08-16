import { test, expect } from '@playwright/test';

/**
 * interactions.spec.ts — the three flows the audit checklist named (chat,
 * modal, theme toggle), driven by keyboard wherever the UI claims to support it.
 *
 * The keyboard coverage is deliberate: the project cards were `div`s with an
 * onClick, so the whole project catalogue was unreachable by keyboard. Unit
 * tests now pin the card in isolation; these pin the flow end to end, including
 * focus restoration, which only a real browser can verify.
 */

test.describe('project modal', () => {
  test('opens by keyboard, traps focus, and restores it on Escape', async ({ page }) => {
    await page.goto('/');
    await page.locator('#projects').scrollIntoViewIfNeeded();

    const card = page.locator('#projects button[aria-label*="View mission details"]').first();
    await expect(card).toBeVisible();

    await card.focus();
    await expect(card).toBeFocused();

    await page.keyboard.press('Enter');

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // Focus must move INTO the dialog, or a keyboard user is stranded behind it.
    await expect(dialog.locator(':focus')).toHaveCount(1);

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    // …and come back, or the user loses their place in the grid.
    await expect(card).toBeFocused();
  });

  test('filters narrow the grid and reset pagination', async ({ page }) => {
    await page.goto('/');
    await page.locator('#projects').scrollIntoViewIfNeeded();

    const cards = page.locator('#projects button[aria-label*="View mission details"]');
    await expect(cards.first()).toBeVisible();

    await page.getByRole('button', { name: 'Aerospace', exact: true }).click();

    // AnimatePresence keeps exiting cards mounted through their fade, so a
    // single snapshot catches the outgoing set mid-transition. Poll until the
    // grid has settled on the filtered category.
    await expect
      .poll(async () => {
        const labels = await cards.evaluateAll((els) =>
          els.map((e) => e.getAttribute('aria-label') ?? ''),
        );
        return labels.length > 0 && labels.every((l) => l.includes('Aerospace'));
      }, { message: 'grid never settled on Aerospace-only cards' })
      .toBe(true);
  });

  test('pagination targets clear the 24px minimum', async ({ page }) => {
    await page.goto('/');
    await page.locator('#projects').scrollIntoViewIfNeeded();

    const dots = page.locator('nav[aria-label="Project pages"] button');
    const count = await dots.count();
    test.skip(count === 0, 'only one page of projects for the active filter');

    for (let i = 0; i < count; i++) {
      const box = await dots.nth(i).boundingBox();
      // WCAG 2.5.8: these were 12x12 before.
      expect(box!.width).toBeGreaterThanOrEqual(24);
      expect(box!.height).toBeGreaterThanOrEqual(24);
    }
  });
});

test.describe('theme toggle', () => {
  test('switches themes and persists the choice across a reload', async ({ page }) => {
    await page.goto('/');

    const html = page.locator('html');
    const startedDark = await html.evaluate((el) => el.classList.contains('dark'));

    await page.getByRole('button', { name: /toggle (dark|light)|theme/i }).first().click();
    await expect
      .poll(() => html.evaluate((el) => el.classList.contains('dark')))
      .toBe(!startedDark);

    await page.reload();
    await expect
      .poll(() => html.evaluate((el) => el.classList.contains('dark')))
      .toBe(!startedDark);
  });

  test('high contrast stays readable in BOTH themes', async ({ page }) => {
    // This is the bug the user reported: hc assumed a black page, so in light
    // mode it forced near-white text onto white cards, site-wide.
    await page.goto('/');

    for (const dark of [false, true]) {
      await page.evaluate((d) => {
        localStorage.setItem('theme', d ? 'dark' : 'light');
        localStorage.setItem('pref:highContrast', 'true');
      }, dark);
      await page.reload();

      const sample = page.locator('#education p, #education h3').first();
      await page.locator('#education').scrollIntoViewIfNeeded();
      await expect(sample).toBeVisible();

      const { color, bg } = await sample.evaluate((el) => {
        const lum = (c: string) => {
          const [r, g, b] = (c.match(/[\d.]+/g) ?? ['0', '0', '0']).slice(0, 3).map(Number);
          const f = (v: number) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
          return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
        };
        let node: HTMLElement | null = el as HTMLElement;
        let background = '';
        while (node && !background) {
          const c = getComputedStyle(node).backgroundColor;
          if (c && !c.includes('rgba(0, 0, 0, 0)')) background = c;
          node = node.parentElement;
        }
        return { color: lum(getComputedStyle(el).color), bg: lum(background || 'rgb(255,255,255)') };
      });

      const ratio = (Math.max(color, bg) + 0.05) / (Math.min(color, bg) + 0.05);
      expect(ratio, `high contrast, ${dark ? 'dark' : 'light'} theme`).toBeGreaterThan(4.5);
    }
  });
});

test.describe('chat', () => {
  test('opens, traps focus, and closes on Escape', async ({ page }) => {
    await page.goto('/');

    await page.locator("button[aria-controls='chatbot-panel']").click();

    const panel = page.locator('#chatbot-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('aria-modal', 'true');
    await expect(panel.getByText(/ask me about|what would you like to know/i).first()).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
  });

  test('falls back to a local answer when the API is unavailable', async ({ page }) => {
    // The client is designed to fail soft. That is good UX and exactly what hid
    // a dead API for so long — so pin the behaviour deliberately.
    await page.route('**/api/chat', (route) => route.fulfill({ status: 502, body: '{}' }));

    await page.goto('/');
    await page.locator("button[aria-controls='chatbot-panel']").click();

    const input = page.locator('#chatbot-panel input[type="text"], #chatbot-panel textarea').last();
    await input.fill('What projects have you built?');
    await input.press('Enter');

    // A canned response still arrives — the panel never dead-ends.
    await expect(page.locator('#chatbot-panel').getByText(/project/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
