/**
 * registerServiceWorker.ts — install the offline worker, carefully.
 *
 * Three conditions, each for a reason:
 *
 *   PRODUCTION ONLY. In dev, Vite serves modules unbundled and a worker that
 *   cached them would serve yesterday's code back to the person editing it —
 *   the most confusing possible failure.
 *
 *   AFTER `load`. Registration kicks off a precache of the whole eager
 *   payload. Doing that during startup puts it in direct competition with the
 *   paint it is supposed to help. This site already measured a 300ms LCP cost
 *   from one 24 KB font preload; a precache is far larger.
 *
 *   NEVER THROWS. An unsupported browser, a private window, or a user who has
 *   blocked storage all reject here, and none of them is a reason to break the
 *   page. Offline support is an enhancement; the site works without it.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Registration can fail for reasons that are not bugs — a private
      // window, blocked storage, an unsupported browser. Swallowed
      // deliberately: there is nothing the visitor could do about it and
      // nothing the site needs it for.
    });
  });
}

export default registerServiceWorker;
