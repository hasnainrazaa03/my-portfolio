/**
 * notFound.test.jsx — an unknown URL must say so, not render the home page.
 *
 * Every unmatched path used to be rewritten to the shell and fell through
 * App's routing to the home page: a mistyped or stale link showed the
 * portfolio under the wrong address with a 200. Now the host answers 404
 * (spaNotFound.test.js) and App renders this page for any pathname it does
 * not recognise — the same page ProjectDetailPage uses for an unknown slug.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import NotFoundPage from '../components/NotFoundPage';

afterEach(cleanup);

describe('NotFoundPage', () => {
  it('explains itself and offers the way home', () => {
    render(<NotFoundPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/doesn.t exist/i);
    expect(screen.getByRole('link', { name: /home page/i })).toHaveAttribute('href', '/');
  });

  it('titles the tab and keeps crawlers off it, then restores both on unmount', () => {
    document.title = 'Before';
    const { unmount } = render(<NotFoundPage />);
    expect(document.title).toMatch(/^Page not found/);
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex');
    unmount();
    expect(document.title).toBe('Before');
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });

  it('takes its own copy and action for the project case', () => {
    render(
      <NotFoundPage
        documentTitle="Project not found"
        title="That project doesn’t exist"
        message="Stale link."
        action={{ href: '/#projects', label: 'See all projects' }}
      />,
    );
    expect(document.title).toMatch(/^Project not found/);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/project doesn.t exist/i);
    expect(screen.getByRole('link', { name: /see all projects/i })).toHaveAttribute('href', '/#projects');
  });
});

describe('App routing', () => {
  // Source-level, like standaloneTheme.test.js: mounting App drags in WebGL.
  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

  it('sends unrecognised pathnames to NotFoundPage instead of the home page', () => {
    expect(app).toMatch(/const NotFoundPage = lazy\(/);
    expect(app).toMatch(
      /path !== '\/' && path !== '\/index\.html'[\s\S]{0,80}<StandalonePage><NotFoundPage \/><\/StandalonePage>/,
    );
  });
});
