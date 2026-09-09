/**
 * Client-side Sentry — loaded AFTER first paint, never before.
 *
 * WHY IT LOADS ONLY WHEN AN ERROR HAPPENS
 * ---------------------------------------
 * `initSentry()` used to run synchronously before `createRoot`, putting the SDK
 * in the entry chunk. On a client-rendered app nothing paints until that chunk
 * has downloaded and executed, so every visitor paid for it before the first
 * pixel — for a library whose job is to report the rare error.
 *
 * Deferring the import to idle fixed the paint but made the TOTAL worse, and
 * the measurement is worth recording: statically imported, Rollup tree-shakes
 * `@sentry/react` down to ~28 KB gzip in the entry chunk. Imported dynamically
 * as a namespace, every export is potentially reachable and it lands as a
 * 159 KB gzip chunk. Idle-loading traded 28 KB eager for 159 KB deferred.
 *
 * So it is not loaded on a timer at all: it loads the first time there is
 * something to send. A session with no errors — the overwhelming majority —
 * downloads nothing, and one that hits an error pays 159 KB at a moment when
 * the visitor already has a problem and nothing is competing for paint.
 *
 * The earlier design's reason for initialising before render still holds: this
 * site once blanked entirely from an error thrown during the first mount, and
 * that class of failure must be captured. Lightweight listeners are registered
 * immediately and buffer anything raised before the SDK arrives.
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
/** Set by `initSentry`; a no-op until then, so a stray error cannot fetch the
 *  SDK on a page that never configured a DSN. */
let loadSdk: () => Promise<void> | undefined = () => undefined;

/**
 * Registered once. Kept at module scope so a second `initSentry()` cannot
 * double-register them (React StrictMode calls effects twice in dev, and a
 * duplicate listener means every uncaught error is reported twice).
 */
let onError: ((e: ErrorEvent) => void) | null = null;
let onRejection: ((e: PromiseRejectionEvent) => void) | null = null;

function unbindListeners(): void {
  if (onError) window.removeEventListener('error', onError);
  if (onRejection) window.removeEventListener('unhandledrejection', onRejection);
  onError = null;
  onRejection = null;
}

/** Bounded so a tight error loop before init cannot grow the buffer forever. */
const MAX_PENDING = 20;

function enqueue(error: unknown, context?: Record<string, unknown>): void {
  if (pending.length < MAX_PENDING) pending.push({ error, context });
  // First report is what pulls the SDK down; see the header.
  void loadSdk();
}

function send(s: SentryModule, { error, context }: Pending): void {
  s.captureException(error, context ? { extra: context } : undefined);
}

/**
 * Register the error buffer. The SDK itself is fetched on the first report —
 * see the header. Safe to call more than once.
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || typeof window === 'undefined') return;
  if (onError) return; // already initialised

  onError = (e: ErrorEvent) => enqueue(e.error ?? e.message, { source: 'window.onerror' });
  onRejection = (e: PromiseRejectionEvent) =>
    enqueue(e.reason, { source: 'unhandledrejection' });
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);

  loadSdk = () => {
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
      unbindListeners();
      for (const item of pending.splice(0)) send(Sentry, item);
    });
    return loading;
  };

  // Anything already buffered (an error thrown between module evaluation and
  // this call) starts the load now.
  if (pending.length) void loadSdk();
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
  loadSdk = () => undefined;
  unbindListeners();
}
