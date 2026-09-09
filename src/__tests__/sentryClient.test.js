/**
 * sentryClient.test.js — the deferred client-side Sentry loader.
 *
 * The SDK used to sit in the entry chunk because init ran synchronously before
 * createRoot. Deferring it to idle fixed the paint but made the total worse:
 * tree-shaken into the entry it is ~28 KB gzip, but as a dynamic namespace
 * import it lands as a 159 KB chunk. So it now loads on the FIRST REPORT — a
 * clean session downloads nothing at all.
 *
 * The property that must survive: an error raised before the SDK arrives — the
 * first-mount crash that once blanked this site — is still reported, just
 * later.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const sentryMock = { init: vi.fn(), captureException: vi.fn() };
vi.mock('@sentry/react', () => sentryMock);

const DSN = 'https://k@o1.ingest.us.sentry.io/1';

// ONE module instance for the whole file. `vi.resetModules()` would hand each
// test a fresh module while leaving the previous one's `window` error listener
// attached — both would then report the same event, and `init` ran twice.
import * as sentry from '../config/sentry';

/** Dispatch a synthetic error event without vitest flagging it as unhandled. */
function dispatchError(error) {
  const swallow = (e) => e.preventDefault();
  window.addEventListener('error', swallow);
  window.dispatchEvent(new ErrorEvent('error', { error, cancelable: true }));
  window.removeEventListener('error', swallow);
}

beforeEach(() => {
  sentry.resetSentryForTests();
  sentryMock.init.mockClear();
  sentryMock.captureException.mockClear();
});
afterEach(() => {
  sentry.resetSentryForTests();
  vi.unstubAllEnvs();
});

const load = async () => sentry;

describe('deferred Sentry', () => {
  it('is a complete no-op without a DSN', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', '');
    const m = await load();
    m.initSentry();
    m.reportError(new Error('x'));
    await m.whenSentryReady();
    expect(sentryMock.init).not.toHaveBeenCalled();
    expect(sentryMock.captureException).not.toHaveBeenCalled();
  });

  it('downloads NOTHING on a session with no errors', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', DSN);
    const m = await load();
    m.initSentry();
    // The whole point: a clean session never pulls the SDK at all.
    await m.whenSentryReady();
    expect(sentryMock.init).not.toHaveBeenCalled();
  });

  it('buffers errors raised before the SDK loads and flushes them after', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', DSN);
    const m = await load();
    m.initSentry();

    m.reportError(new Error('from a boundary'), { componentStack: 'x' });
    dispatchError(new Error('uncaught'));

    // The first report is what triggers the load.
    await m.whenSentryReady();

    expect(sentryMock.init).toHaveBeenCalledTimes(1);
    expect(sentryMock.captureException).toHaveBeenCalledTimes(2);
    const [err, opts] = sentryMock.captureException.mock.calls[0];
    expect(err.message).toBe('from a boundary');
    expect(opts).toEqual({ extra: { componentStack: 'x' } });
  });

  it('reports directly once the SDK is up', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', DSN);
    const m = await load();
    m.initSentry();
    m.reportError(new Error('first'));
    await m.whenSentryReady();
    sentryMock.captureException.mockClear();

    m.reportError(new Error('later'));
    expect(sentryMock.captureException).toHaveBeenCalledTimes(1);
  });

  it('bounds the pre-init buffer so an error loop cannot grow it forever', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', DSN);
    const m = await load();
    m.initSentry();
    for (let i = 0; i < 60; i++) m.reportError(new Error(`e${i}`));
    await m.whenSentryReady();
    expect(sentryMock.captureException.mock.calls.length).toBeLessThanOrEqual(20);
  });

  it('stops double-reporting once the SDK owns the global handlers', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', DSN);
    const m = await load();
    m.initSentry();
    m.reportError(new Error('trigger the load'));
    await m.whenSentryReady();
    sentryMock.captureException.mockClear();
    // Our pre-init listener must be gone; the SDK installs its own.
    dispatchError(new Error('after'));
    expect(sentryMock.captureException).not.toHaveBeenCalled();
  });

  it('an uncaught error alone is enough to pull the SDK', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', DSN);
    const m = await load();
    m.initSentry();
    dispatchError(new Error('boom'));
    await m.whenSentryReady();
    expect(sentryMock.init).toHaveBeenCalledTimes(1);
    expect(sentryMock.captureException).toHaveBeenCalledTimes(1);
  });

  it('an unhandled rejection does too', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', DSN);
    const m = await load();
    m.initSentry();
    const ev = new Event('unhandledrejection');
    ev.reason = new Error('rejected');
    window.dispatchEvent(ev);
    await m.whenSentryReady();
    expect(sentryMock.captureException).toHaveBeenCalledTimes(1);
  });
});
