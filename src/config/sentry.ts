/**
 * Client-side Sentry — loaded AFTER first paint, never before.
 *
 * WHY DEFERRED
 * ------------
 * `@sentry/react` is ~28 KB gzipped, and it used to sit in the entry chunk
 * because `initSentry()` ran synchronously before `createRoot`. On a
 * client-rendered app nothing can paint until the entry chunk has downloaded
 * and executed, so that was 28 KB of bytes and parse time between a mobile
 * visitor and the first pixel — for a library whose job is to report the rare
 * error, not to render anything.
 *
 * The SDK is now imported on idle. The earlier design's reason for running
 * before render still holds — this site once blanked entirely from an error
 * thrown during the first mount, and that class of failure must be captured —
 * so a tiny listener buffers anything that happens before the SDK arrives and
 * flushes it the moment `init` completes. Nothing is lost; it is just reported
 * a second or two later.
 *
 * Gated on `VITE_SENTRY_DSN`: with no DSN this is a no-op, so local dev and
 * anyone who clones the repo never ship telemetry anywhere. The DSN is a public
 * value by design (it only permits *writing* events).
 *
 * DELIBERATELY OFF
 *  - Session Replay. It records real visitors' sessions — surveillance of
 *    people reading a CV, and at odds with the privacy posture elsewhere
 *    (hashed IPs, no UA, no referrer).
 *  - `sendDefaultPii`. Same reason.
 */
type SentryModule = typeof import('@sentry/react');

interface Pending {
  error: unknown;
  context?: Record<string, unknown>;
}

let sdk: SentryModule | null = null;
let loading: Promise<void> | null = null;
const pending: Pending[] = [];

/** Bounded so a tight error loop before init cannot grow the buffer forever. */
const MAX_PENDING = 20;

function enqueue(error: unknown, context?: Record<string, unknown>): void {
  if (pending.length < MAX_PENDING) pending.push({ error, context });
}

function send(s: SentryModule, { error, context }: Pending): void {
  s.captureException(error, context ? { extra: context } : undefined);
}

/**
 * Schedule the SDK load for when the browser is idle. Errors raised in the
 * meantime are buffered by the listeners below and reported once it is up.
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || typeof window === 'undefined') return;

  const onError = (e: ErrorEvent) => enqueue(e.error ?? e.message, { source: 'window.onerror' });
  const onRejection = (e: PromiseRejectionEvent) =>
    enqueue(e.reason, { source: 'unhandledrejection' });
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);

  const load = () => {
    loading ??= import('@sentry/react').then((Sentry) => {
      Sentry.init({
        dsn,
        environment: import.meta.env.MODE,
        // Errors are the point here. Tracing on a static portfolio adds request
        // volume and quota burn for information Lighthouse already gives us.
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
      sdk = Sentry;
      // The SDK installs its own global handlers now; ours would double-report.
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      for (const item of pending.splice(0)) send(Sentry, item);
    });
    return loading;
  };

  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  };
  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(() => void load(), { timeout: 4000 });
  } else {
    // Safari: no idle callback. Wait for load + a beat so we never race paint.
    window.setTimeout(() => void load(), 1500);
  }
}

/**
 * Report a caught error with context. Safe to call at any time: before the SDK
 * has loaded the report is buffered; with no DSN configured it is a no-op.
 */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  if (sdk) send(sdk, { error, context });
  else enqueue(error, context);
}

/** Test seam: resolves once the SDK has loaded (or immediately if never scheduled). */
export function whenSentryReady(): Promise<void> {
  return loading ?? Promise.resolve();
}

/** Test seam: reset module state between cases. */
export function resetSentryForTests(): void {
  sdk = null;
  loading = null;
  pending.length = 0;
}
