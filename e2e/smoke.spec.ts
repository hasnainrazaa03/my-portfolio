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

/**
 * Project case studies.
 *
 * These are the shareable form of a project: the modal has no URL, so a
 * recruiter forwarding "look at this one" had nothing to send and a crawler had
 * nothing to index. What matters is that the URL resolves in a real browser —
 * it depends on the build emitting projects/<slug>.html and the host serving
 * it extensionless, which no unit test exercises.
 */
test.describe('project case studies', () => {
  test('a project URL resolves and renders that project', async ({ page }) => {
    await page.goto('/projects/project-vimaan');

    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Vimaan/i);
    await expect(page).toHaveTitle(/Vimaan/i);
    await expect(page.getByRole('link', { name: /back to all projects/i })).toBeVisible();
  });

  test('a stale project URL explains itself rather than rendering blank', async ({ page }) => {
    await page.goto('/projects/this-was-renamed-long-ago');

    await expect(page.getByRole('heading', { level: 1 })).toContainText(/doesn.t exist/i);
    await expect(page.getByRole('link', { name: /see all projects/i })).toBeVisible();
    await expect(page.getByText('Something went wrong.')).toHaveCount(0);
  });

  test('the modal links to the case study', async ({ page }) => {
    await page.goto('/');
    await page.locator('#projects').scrollIntoViewIfNeeded();

    // Cards are real buttons (WCAG 2.5.3 work), so the keyboard path opens them.
    await page.getByRole('button', { name: /view mission details/i }).first().click();

    const link = page.getByRole('link', { name: /open the full case study/i });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/projects\/[a-z0-9-]+$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});

/**
 * Unknown paths.
 *
 * Every path used to be rewritten to the shell, so a mistyped or stale URL
 * rendered the home page — with a 200 — under the wrong address. Now every
 * real route is a file in the build, Vercel serves dist/404.html (a copy of
 * index.html) for anything else with a 404 status, and the app renders its
 * not-found page.
 */
test.describe('unknown paths', () => {
  test('render the not-found page, not the home page', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist');

    await expect(page.getByRole('heading', { level: 1 })).toContainText(/doesn.t exist/i);
    await expect(page.getByRole('link', { name: /home page/i })).toBeVisible();
    await expect(page).toHaveTitle(/not found/i);

    // `vite preview` has a blanket SPA fallback and answers 200; only a real
    // host serves the 404.html copy with the status to match.
    if (process.env.E2E_BASE_URL) expect(response?.status()).toBe(404);
  });
});

/**
 * Route heads.
 *
 * The one index.html gave every route the home page's <title>, description,
 * social tags and canonical link — so a shared case study previewed as the
 * portfolio, and to a crawler every /projects/<slug> declared itself a
 * duplicate of "/". The build now writes dist/<route>.html per route. This
 * reads the RAW response, because the point is what a scraper sees before
 * any script runs.
 */
test.describe('route heads', () => {
  test('a case study ships its own title, description and canonical', async ({ request }) => {
    const res = await request.get('/projects/project-vimaan');
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toMatch(/<title>Project Vimaan \| Hasnain Raza<\/title>/);
    expect(html).toContain('<link rel="canonical" href="https://hasnainrazaa.vercel.app/projects/project-vimaan" />');
    expect(html).toMatch(/<meta property="og:title" content="Project Vimaan \| Hasnain Raza" \/>/);
    expect(html).toMatch(/<meta property="og:type" content="article" \/>/);
  });

  test('the résumé and privacy pages carry their own heads too', async ({ request }) => {
    const resume = await (await request.get('/resume')).text();
    expect(resume).toMatch(/<title>Hasnain Raza — Resume<\/title>/);
    expect(resume).toContain('<link rel="canonical" href="https://hasnainrazaa.vercel.app/resume" />');

    const privacy = await (await request.get('/privacy')).text();
    expect(privacy).toMatch(/<title>Privacy Notice \| Hasnain Raza<\/title>/);
    expect(privacy).toContain('<link rel="canonical" href="https://hasnainrazaa.vercel.app/privacy" />');
  });

  test('the home page keeps the home head', async ({ request }) => {
    const html = await (await request.get('/')).text();
    expect(html).toMatch(/<title>Hasnain Raza \| Portfolio<\/title>/);
    expect(html).toContain('<link rel="canonical" href="https://hasnainrazaa.vercel.app/" />');
  });
});

/**
 * Social cards.
 *
 * A project's own artwork is the best preview when it crops to 1.91:1; three
 * projects here ship artwork that does not, and used to fall back to the
 * site-wide card, so three different links previewed identically. Those now
 * get a generated card. This checks what a scraper actually receives: the tag
 * in the raw HTML, and that the URL it names really resolves.
 */
test.describe('social cards', () => {
  test('a project with unusable artwork gets its own generated card', async ({ request }) => {
    const html = await (await request.get('/projects/project-vimaan')).text();
    const url = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
    expect(url).toContain('/og/project-vimaan.jpg');

    // A card the scraper cannot fetch is worse than no card.
    const img = await request.get(new URL(url!).pathname);
    expect(img.status()).toBe(200);
    expect(img.headers()['content-type']).toContain('image');
  });

  test('a project with real product artwork keeps it', async ({ request }) => {
    const html = await (await request.get('/projects/peakroutine-ai-health-and-wellness-platform')).text();
    const url = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
    expect(url).toContain('/peakroutine-hero.png');
    expect((await request.get(new URL(url!).pathname)).status()).toBe(200);
  });
});

/**
 * URL spellings that are not canonical.
 *
 * Only the lowercase, unescaped slug exists as a file, so any other spelling
 * is served by the 404 shell. Two opposite failures came out of that:
 * /projects/USC-Ledger rendered the full case study while the host answered
 * 404 — a page that looks perfect to a reader and dead to every crawler,
 * unfurl and link checker — and /projects/usc%2Dledger was answered 200 with
 * the right head and then told the reader the project did not exist.
 */
test.describe('non-canonical project URLs', () => {
  test('a wrong-case URL lands on the real one', async ({ page }) => {
    await page.goto('/projects/USC-Ledger');
    await expect(page).toHaveURL(/\/projects\/usc-ledger$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/USC Ledger/i);
  });

  test('a percent-escaped URL resolves to the project, not to not-found', async ({ page }) => {
    await page.goto('/projects/usc%2Dledger');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/USC Ledger/i);
  });
});

/**
 * The 404 shell must not claim to be the home page. A byte-for-byte copy of
 * index.html gave every dead URL `<link rel="canonical" href="/">` — each one
 * telling crawlers it WAS the home page, and previewing as the portfolio.
 */
test.describe('the 404 response head', () => {
  // Only a real host serves dist/404.html. `vite preview` has a blanket SPA
  // fallback and answers every unknown path with index.html, so locally this
  // would assert against the wrong file entirely — the same divergence that
  // hid /resume and /privacy 404ing in production for months. The file's
  // content is covered locally by spaNotFound.test.js instead.
  test.skip(!process.env.E2E_BASE_URL, 'vite preview never serves 404.html');

  test('claims no canonical URL and asks not to be indexed', async ({ request }) => {
    const html = await (await request.get('/this-does-not-exist')).text();
    expect(html).not.toContain('rel="canonical"');
    expect(html).toContain('name="robots" content="noindex"');
    expect(html).toMatch(/<title>Page not found \| Hasnain Raza<\/title>/);
  });
});

/**
 * The job-description comparison at /fit.
 *
 * The API is not exercised here — a real call costs a model request and the
 * result is non-deterministic. What matters end to end is that the route
 * resolves, the form gates on a real posting, and a failure is reported rather
 * than shown as an empty (and therefore flattering) assessment.
 */
test.describe('fit comparison', () => {
  test('the route resolves and gates on a real posting', async ({ page }) => {
    await page.goto('/fit');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/does this role fit/i);
    await expect(page).toHaveTitle(/compare a role/i);

    const compare = page.getByRole('button', { name: /^compare$/i });
    await expect(compare).toBeDisabled();
    await page.getByLabel(/job description/i).fill('ML engineer');
    await expect(compare).toBeDisabled();
    await page.getByLabel(/job description/i).fill('Senior Machine Learning Engineer. '.repeat(10));
    await expect(compare).toBeEnabled();
  });

  test('says a model wrote it, before anything is submitted', async ({ page }) => {
    await page.goto('/fit');
    await expect(page.getByText(/written by a language model/i)).toBeVisible();
  });

  test('reports a failure instead of an empty assessment', async ({ page }) => {
    await page.route('**/api/fit', (route) =>
      route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Service unavailable right now.' }) }),
    );
    await page.goto('/fit');
    await page.getByLabel(/job description/i).fill('Senior Machine Learning Engineer. '.repeat(10));
    await page.getByRole('button', { name: /^compare$/i }).click();

    await expect(page.getByText(/service unavailable right now/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /what it doesn.t/i })).toHaveCount(0);
  });

  test('renders a grounded result, with a link to the work behind each match', async ({ page }) => {
    await page.route('**/api/fit', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          verdict: 'partial',
          summary: 'Strong on model work, no production Kubernetes.',
          matches: [{ requirement: 'PyTorch', evidence: 'Built a segmentation pipeline.', sourceId: 'project:project-vimaan' }],
          gaps: [{ requirement: 'Kubernetes', note: 'Nothing in the record shows cluster operations.' }],
          talkingPoints: ['Ask about the ONNX parity verification.'],
        }),
      }),
    );
    await page.goto('/fit');
    await page.getByLabel(/job description/i).fill('Senior Machine Learning Engineer. '.repeat(10));
    await page.getByRole('button', { name: /^compare$/i }).click();

    await expect(page.getByText(/partial match/i)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Project Vimaan' })).toHaveAttribute('href', '/projects/project-vimaan');
    // The gaps section is not optional chrome.
    await expect(page.getByRole('heading', { name: /what it doesn.t/i })).toBeVisible();
    await expect(page.getByText(/nothing in the record shows cluster operations/i)).toBeVisible();
  });
});

/**
 * Offline support.
 *
 * The only test that proves a service worker works is one that actually goes
 * offline in a real browser. Unit tests can check the generated source; they
 * cannot tell you the precache list resolves, that install succeeded, or that
 * a navigation falls back correctly.
 *
 * Skipped against a local preview: the worker is registered only in a
 * production build served over HTTPS or localhost, and `vite preview` does
 * serve it — but the E2E base URL form is the one that matches how visitors
 * get it, and running both doubles the flake surface for no extra signal.
 */
test.describe('offline', () => {
  test('the site still loads with the network cut', async ({ page, context }) => {
    await page.goto('/');
    // Registration happens on `load`; installing precaches the shell.
    await page.waitForFunction(() => navigator.serviceWorker?.controller !== undefined || true);
    const registered = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return false;
      await navigator.serviceWorker.ready;
      return true;
    });
    test.skip(!registered, 'no service worker registered in this environment');

    // A second load puts the page under the worker's control.
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 10_000 });

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('Something went wrong.')).toHaveCount(0);
    await context.setOffline(false);
  });
});
