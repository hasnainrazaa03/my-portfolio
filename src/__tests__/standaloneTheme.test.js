/**
 * standaloneTheme.test.js — the theme must reach every route, before paint.
 *
 * Two related defects. The stand-alone routes (/privacy, /resume,
 * /projects/<slug>) returned bare trees OUTSIDE the ThemeProvider, and since
 * the `dark`/`hc` classes were applied only by that provider's effects, every
 * `dark:` style on those pages was dead — a dark-mode visitor clicking "Open
 * the full case study" got a white page. And on the main page the classes
 * arrived only after hydration, so dark-mode visitors saw a white flash first.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

describe('stand-alone routes', () => {
  it('every early return renders through StandalonePage', () => {
    // Only App's own body: StandalonePage's definition ALSO returns a
    // <MotionConfig> tree, so slice from the component to its main return.
    const start = app.indexOf('export default function App()');
    const early = app.slice(start, app.lastIndexOf('return (\n    <MotionConfig'));
    const returns = [...early.matchAll(/return\s+([^;]+);/g)]
      .map((m) => m[1].trim())
      .filter((r) => r.startsWith('<'));
    expect(returns.length).toBeGreaterThanOrEqual(3);
    for (const r of returns) expect(r, r).toMatch(/^<StandalonePage>/);
  });

  it('StandalonePage provides the theme and records a page view', () => {
    const shell = app.slice(app.indexOf('function StandalonePage'), app.indexOf('function useScrollToHashWhenReady'));
    expect(shell).toContain('<ThemeProvider>');
    expect(shell).toContain('<Analytics />');
    expect(shell).toContain('<ErrorBoundary>');
  });
});

describe('theme bootstrap', () => {
  const boot = html.match(/<script>([^<]*localStorage\.getItem\('theme'\)[^<]*)<\/script>/)?.[1] ?? '';

  it('is an inline script in the head, ahead of the app', () => {
    expect(boot).not.toBe('');
    expect(html.indexOf(boot)).toBeLessThan(html.indexOf('src="/src/main.tsx"'));
  });

  it('applies both saved preferences and the OS fallbacks', () => {
    expect(boot).toContain("localStorage.getItem('theme')");
    expect(boot).toContain('prefers-color-scheme: dark');
    expect(boot).toContain("localStorage.getItem('pref:highContrast')");
    expect(boot).toContain('prefers-contrast: more');
    expect(boot).toContain("classList.add('dark')");
    expect(boot).toContain("classList.add('hc')");
  });

  it('cannot throw before the app loads', () => {
    // A storage access can throw (private mode); the whole thing is wrapped.
    expect(boot).toMatch(/^\(function\(\)\{try\{[\s\S]*\}catch\(e\)\{\}\}\)\(\)$/);
  });
});
