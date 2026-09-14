import { createElement, lazy, type ComponentType } from 'react';
import ChunkUnavailable from '../components/ChunkUnavailable';

/**
 * lazyWithRecovery — React.lazy that survives a chunk it cannot fetch.
 *
 * WHY: with plain lazy(), a failed import throws, and every section here sits
 * under the app-level error boundary — so ONE missing chunk replaced the whole
 * page with "Something went wrong." Two ordinary situations cause that:
 *
 *   OFFLINE. The service worker precaches the shell, not every section; a page
 *     reloaded offline before a below-the-fold chunk was fetched could not load
 *     it. The production health check caught this intermittently.
 *   AFTER A DEPLOY. An open tab still asks for the previous build's hashed
 *     chunk names, which the new deployment does not serve.
 *
 * So: online, a failed chunk reloads the page once, which fetches the current
 * build. Offline — or if that reload did not help — only the section shows a
 * small notice with a retry, and the rest of the page stays up.
 *
 * Only genuine fetch failures are handled. A module that loads and then throws
 * is a real bug, and still reaches the error boundary and Sentry.
 */

const RELOAD_KEY = 'chunk-reload-at';
const RELOAD_WINDOW_MS = 60_000;

/** The messages browsers use for a dynamic import that could not be fetched. */
export function isChunkLoadError(err: unknown): boolean {
  const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  return /dynamically imported module|importing a module script failed|error loading dynamically imported module|unable to preload css|failed to fetch/i.test(
    message,
  );
}

/** True the first time, then false for a minute — so a missing file cannot cause a reload loop. */
export function shouldReload(now = Date.now()): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY));
    if (last && now - last < RELOAD_WINDOW_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(now));
    return true;
  } catch {
    // No storage means no loop guard; never reload blind.
    return false;
  }
}

interface Options {
  /** Human name for the notice ("Projects"). */
  name: string;
  /** Render nothing instead of the notice — for floating widgets, not page sections. */
  silent?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mirrors React.lazy's own signature
export function lazyWithRecovery<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  { name, silent = false }: Options,
) {
  return lazy(() =>
    factory().catch((err: unknown) => {
      if (!isChunkLoadError(err)) throw err;

      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      if (!offline && typeof window !== 'undefined' && shouldReload()) {
        window.location.reload();
        // Hold the Suspense fallback while the reload happens.
        return new Promise<{ default: T }>(() => {});
      }

      const Fallback = () => (silent ? null : createElement(ChunkUnavailable, { name, offline }));
      return { default: Fallback as unknown as T };
    }),
  );
}
