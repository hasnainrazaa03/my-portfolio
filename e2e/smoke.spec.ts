import { test, expect } from './fixtures';

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

  test('survives a canvas that cannot draw', async ({ browser }) => {
    // The condition that once took the site down was a graphics context that
    // could not be created, thrown from inside an effect. The hero is Canvas 2D
    // now; with no context it must show the still picture, not an error.
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.addInitScript(() => {
      HTMLCanvasElement.prototype.getContext = () => null;
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('Something went wrong.')).toHaveCount(0);
    await expect(page.getByRole('img', { name: /streamlines of ideal flow/i })).toBeVisible();
    await context.close();
  });

  test('the hero flow picture pitches with the cursor and says what it is', async ({ page }) => {
    await page.goto('/');
    const slider = page.getByRole('slider', { name: /angle of attack/i });
    await expect(slider).toBeVisible();
    await expect(page.getByText(/Ideal flow/)).toBeVisible();
    const box = (await slider.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.1);
    const high = Number(await slider.getAttribute('aria-valuenow'));
    await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.9);
    const low = Number(await slider.getAttribute('aria-valuenow'));
    expect(high).toBeGreaterThan(low);
    // Nothing threw during the animation.
    await expect(page.getByText('Something went wrong.')).toHaveCount(0);
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

    // Structured data, in the raw response where a crawler reads it.
    const block = /<script type="application\/ld\+json" data-route>([\s\S]*?)<\/script>/.exec(html);
    expect(block, 'no per-route JSON-LD').not.toBeNull();
    const work = JSON.parse(block![1])['@graph'].find((n: { '@id'?: string }) => n['@id']?.endsWith('#work'));
    expect(work['@type']).toBe('SoftwareSourceCode');
    expect(work.codeRepository).toBe('https://github.com/hasnainrazaa03/Project-Vimaan');
  });

  test('the structured data raises no CSP violation under the real header', async ({ page }) => {
    // The per-route JSON-LD carries no pinned hash, on the basis that browsers
    // do not apply script-src to data blocks. Against production this runs
    // under the enforcing policy, so a browser that disagrees fails here.
    await page.addInitScript(() => {
      (window as unknown as { __csp: string[] }).__csp = [];
      document.addEventListener('securitypolicyviolation', (e) =>
        (window as unknown as { __csp: string[] }).__csp.push(`${e.violatedDirective} ${e.sample}`),
      );
    });
    await page.goto('/projects/project-vimaan');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForLoadState('networkidle');
    const violations = await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);
    expect(violations.filter((v) => v.startsWith('script-src'))).toEqual([]);
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
    expect(url).toContain('/peakroutine-app.jpg');
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
    await page.goto('/projects/Orbit-Expense-Tracker');
    await expect(page).toHaveURL(/\/projects\/orbit-expense-tracker$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Orbit Expense Tracker/i);
  });

  test('a percent-escaped URL resolves to the project, not to not-found', async ({ page }) => {
    await page.goto('/projects/orbit%2Dexpense-tracker');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Orbit Expense Tracker/i);
  });

  test('the old USC Ledger URL lands on Orbit', async ({ page }) => {
    // A Vercel redirect, so only the real host has it; vite preview does not.
    test.skip(!process.env.E2E_BASE_URL, 'redirects exist only on the deployed host');
    await page.goto('/projects/usc-ledger');
    await expect(page).toHaveURL(/\/projects\/orbit-expense-tracker$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Orbit Expense Tracker/i);
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
/**
 * A section whose code cannot be fetched must not take the page down.
 *
 * It used to: every section sits under the app-level error boundary, so one
 * failed chunk replaced the whole page with "Something went wrong." The daily
 * production check caught it intermittently offline, and the same happens to
 * an open tab after any deploy, when the old chunk names stop existing.
 */
test.describe('unfetchable section chunks', () => {
  // After the recovery reload the service worker controls the page, and
  // requests a service worker makes are invisible to page.route — so the
  // blocked chunk would quietly load through it and the test would prove
  // nothing. Offline behaviour with the worker is covered by the next block.
  test.use({ serviceWorkers: 'block' });

  test('the page stays up and only that section says it did not load', async ({ page }) => {
    // Every attempt fails, so the one recovery reload happens and then the notice shows.
    await page.route(/\/assets\/Projects-[^/]+\.js$/, (route) => route.abort());
    // The section chunk is requested at mount, so the recovery reload fires
    // straight away; wait for the notice that follows it rather than scrolling
    // (a scroll loop dies mid-reload with "execution context destroyed").
    await page.goto('/');
    const notice = page.getByText("Projects didn't load");
    await notice.waitFor({ state: 'attached', timeout: 15_000 });
    await notice.scrollIntoViewIfNeeded();
    await expect(notice).toBeVisible();
    await expect(page.getByRole('button', { name: /try again/i })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('Something went wrong.')).toHaveCount(0);
  });
});

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

test.describe('case study architecture', () => {
  test('Vimaan explains how it works, with its guards visible', async ({ page }) => {
    await page.goto('/projects/project-vimaan');
    await expect(page.getByRole('heading', { level: 2, name: /how it works/i })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Worker thread' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'X-Plane main thread' })).toBeVisible();
    await expect(page.getByText(/queue\.Queue/)).toBeVisible();
    await expect(page.getByText('Rejected with a spoken error')).toBeVisible();
  });

  test('projects without a diagram do not render an empty section', async ({ page }) => {
    await page.goto('/projects/numerical-investigation-of-store-separation-from-a-rectangular-cavity');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: /how it works/i })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /physics underneath/i })).toHaveCount(0);
  });

  test('both web projects draw their real request paths', async ({ page }) => {
    await page.goto('/projects/manzil-recipe-vault');
    await expect(page.getByRole('region', { name: 'Express API — import' })).toBeVisible();
    await expect(page.getByText('400 blocked_address')).toBeVisible();

    await page.goto('/projects/orbit-expense-tracker');
    await expect(page.getByRole('region', { name: 'Express API' })).toBeVisible();
    await expect(page.getByText(/Queued in IndexedDB/)).toBeVisible();
    await expect(page.getByRole('link', { name: /live demo/i })).toHaveCount(0);
  });
});

test.describe('lift-curve explorer', () => {
  const naca = '/projects/numerical-investigation-of-vortex-influence-on-naca-4412-airfoil';

  test('is labelled as a model, and the slider and pointer both drive the readout', async ({ page }) => {
    await page.goto(naca);
    await expect(page.getByText('Textbook model')).toBeVisible();

    const slider = page.getByLabel('Angle of attack');
    await slider.focus();
    await slider.press('Home'); // −8°
    const readout = page.getByText(/the model gives/);
    await expect(readout).toContainText('α = −8.0°');
    await expect(readout).toContainText('NACA 0012 cl = −0.88');

    // Hovering the far right of the plot selects the top of the range.
    const plot = page.locator('figure svg[role="img"]');
    await plot.scrollIntoViewIfNeeded();
    const box = await plot.boundingBox();
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.5);
    await expect(readout).toContainText('near or past stall');
  });

  test('stays readable on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(naca);
    const tick = page.locator('figure svg[role="img"] text', { hasText: /^12°$/ });
    await tick.scrollIntoViewIfNeeded();
    const size = await tick.evaluate((el) => el.getBoundingClientRect().height);
    // The first version rendered axis labels about 6px tall at this width.
    expect(size).toBeGreaterThanOrEqual(9);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});

/**
 * The private insights page. The real API needs ANALYTICS_SECRET_TOKEN, so the
 * data is mocked; what matters end to end is that the route exists, stays out
 * of search, shows nothing without a token, and renders what the API returns.
 */
test.describe('visitor insights', () => {
  test('is noindex and shows only a token form until a token is accepted', async ({ page, request }) => {
    const html = await (await request.get('/insights')).text();
    expect(html).toContain('name="robots" content="noindex"');

    await page.goto('/insights');
    await expect(page.getByRole('heading', { level: 1, name: /visitor insights/i })).toBeVisible();
    await expect(page.getByLabel(/analytics token/i)).toHaveAttribute('type', 'password');
    await expect(page.getByText(/questions per day/i)).toHaveCount(0);
  });

  test('renders insights once the API accepts the token', async ({ page }) => {
    const now = new Date().toISOString();
    await page.route('**/api/analytics', (route) => {
      const ok = route.request().headers().authorization === 'Bearer test-token';
      return route.fulfill({
        status: ok ? 200 : 401,
        contentType: 'application/json',
        body: JSON.stringify(
          ok
            ? {
                success: true,
                insights: {
                  rows: 1, from: now, to: now,
                  totals: { questions: 1, conversations: 1, medianPerConversation: 1, offTopic: 0, possibleGaps: 0 },
                  timestamps: [now],
                  topics: [{ id: 'projects', label: 'Projects', count: 1 }],
                  mentions: [{ label: 'Project Vimaan', count: 1 }],
                  possibleGaps: [], offTopic: [],
                  recent: [{ question: 'How did you validate the ONNX export?', at: now, topics: ['Projects'] }],
                },
              }
            : { error: 'Unauthorized' },
        ),
      });
    });

    await page.goto('/insights');
    await page.getByLabel(/analytics token/i).fill('wrong');
    await page.getByRole('button', { name: /view insights/i }).click();
    await expect(page.getByText(/that token was not accepted/i)).toBeVisible();

    await page.getByLabel(/analytics token/i).fill('test-token');
    await page.getByRole('button', { name: /view insights/i }).click();
    await expect(page.getByText('How did you validate the ONNX export?')).toBeVisible();
    await expect(page.getByRole('group', { name: /questions per day/i })).toBeVisible();
  });
});
