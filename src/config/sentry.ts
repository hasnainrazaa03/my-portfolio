import * as Sentry from '@sentry/react';

/**
 * Client-side Sentry init.
 *
 * Gated on `VITE_SENTRY_DSN`: with no DSN this is a no-op, so local dev and
 * anyone who clones the repo never ship telemetry anywhere. The DSN is a public
 * value by design (it only permits *writing* events), which is why it is safe
 * as a `VITE_` var — unlike a secret, it grants no read access.
 *
 * DELIBERATELY OFF:
 *  - Session Replay. It records real visitors' sessions. Useful for debugging,
 *    but it is surveillance of people reading a CV, and it would undercut the
 *    privacy posture the rest of this app maintains (hashed IPs, no UA, no
 *    referrer). Turn it on only as a conscious decision.
 *  - `sendDefaultPii`. Same reason.
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Errors are the point here. Performance tracing on a static portfolio adds
    // request volume and quota burn for information Lighthouse already gives us.
    tracesSampleRate: 0,
    sendDefaultPii: false,

    // Drop noise that is not actionable: extensions, and the benign
    // ResizeObserver loop warning browsers emit during layout.
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
    ],
    denyUrls: [/extensions\//i, /^chrome:\/\//i, /^moz-extension:\/\//i],

    beforeSend(event) {
      // Never let a stray query string carrying a token reach Sentry.
      if (event.request?.url) event.request.url = event.request.url.split('?')[0];
      return event;
    },
  });
}

/** Report a caught error with context. No-op when Sentry was never initialised. */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
