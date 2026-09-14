/**
 * lazyWithRecovery.test.jsx — one unfetchable chunk must not take the page down.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { Suspense } from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import ErrorBoundary from '../components/ErrorBoundary';
import { lazyWithRecovery, isChunkLoadError, shouldReload } from '../utils/lazyWithRecovery';

vi.mock('../config/sentry', () => ({ reportError: vi.fn() }));

const chunkError = () => new TypeError('Failed to fetch dynamically imported module: https://x/assets/Projects-abc.js');
const reload = vi.fn();
let online = true;

beforeEach(() => {
  sessionStorage.clear();
  reload.mockClear();
  online = true;
  Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, reload } });
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => online });
});
afterEach(cleanup);

const mount = (Lazy) =>
  render(
    <ErrorBoundary fallback={<p>Something went wrong.</p>}>
      <h1>Page</h1>
      <Suspense fallback={<p>loading</p>}>
        <Lazy />
      </Suspense>
    </ErrorBoundary>,
  );

describe('lazyWithRecovery', () => {
  it('renders the section normally when the chunk loads', async () => {
    const Lazy = lazyWithRecovery(() => Promise.resolve({ default: () => <p>Projects content</p> }), { name: 'Projects' });
    mount(Lazy);
    expect(await screen.findByText('Projects content')).toBeInTheDocument();
  });

  it('offline, shows a notice for that section and keeps the page up', async () => {
    online = false;
    const Lazy = lazyWithRecovery(() => Promise.reject(chunkError()), { name: 'Projects' });
    mount(Lazy);
    expect(await screen.findByText("Projects isn't available offline yet")).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Page' })).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong.')).not.toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
  });

  it('online, reloads once to pick up the current build', async () => {
    const Lazy = lazyWithRecovery(() => Promise.reject(chunkError()), { name: 'Projects' });
    mount(Lazy);
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(screen.getByText('loading')).toBeInTheDocument(); // holds the fallback while reloading
  });

  it('does not reload again if the reload did not help — no loop', async () => {
    shouldReload(); // a reload just happened
    const Lazy = lazyWithRecovery(() => Promise.reject(chunkError()), { name: 'Projects' });
    mount(Lazy);
    expect(await screen.findByText("Projects didn't load")).toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
  });

  it('lets a REAL bug through to the error boundary', async () => {
    const Lazy = lazyWithRecovery(() => Promise.reject(new Error('Cannot read properties of undefined')), { name: 'Projects' });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mount(Lazy);
    expect(await screen.findByText('Something went wrong.')).toBeInTheDocument();
    console.error.mockRestore();
  });

  it('renders nothing for a silent widget', async () => {
    online = false;
    const Lazy = lazyWithRecovery(() => Promise.reject(chunkError()), { name: 'Chat', silent: true });
    const { container } = mount(Lazy);
    await vi.waitFor(() => expect(screen.queryByText('loading')).not.toBeInTheDocument());
    expect(container.textContent).toBe('Page');
  });
});

describe('isChunkLoadError', () => {
  it('recognises each browser\'s wording', () => {
    for (const m of [
      'Failed to fetch dynamically imported module: /assets/a.js', // Chromium
      'error loading dynamically imported module', // Firefox
      'Importing a module script failed.', // Safari
      'Unable to preload CSS for /assets/a.css', // Vite
    ]) {
      expect(isChunkLoadError(new TypeError(m)), m).toBe(true);
    }
  });

  it('does not mistake ordinary errors for chunk failures', () => {
    expect(isChunkLoadError(new Error('x is not a function'))).toBe(false);
    expect(isChunkLoadError(new RangeError('Invalid array length'))).toBe(false);
  });
});
