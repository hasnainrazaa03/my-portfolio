/**
 * sentryClient.test.js — the deferred client-side Sentry loader.
 *
 * The SDK is ~28 KB gzipped and used to sit in the entry chunk because init ran
 * synchronously before createRoot — on a client-rendered app that is 28 KB
 * between a mobile visitor and the first pixel. It now loads on idle, after
 * paint. The property that must survive the deferral: an error raised BEFORE
 * the SDK arrives — the first-mount crash that once blanked this site — is
 * still reported, just later.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const sentryMock = { init: vi.fn(), captureException: vi.fn() };
vi.mock('@sentry/react', () => sentryMock);

const DSN = 'https://k@o1.ingest.us.sentry.io/1';
let idleCb;

beforeEach(() => {
  vi.resetModules();
  sentryMock.init.mockClear();
  sentryMock.captureException.mockClear();
  idleCb = null;
  window.requestIdleCallback = vi.fn((cb) => { idleCb = cb; return 1; });
  window.cancelIdleCallback = vi.fn();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  delete window.requestIdleCallback;
  delete window.cancelIdleCallback;
});

const load = () => import('../config/sentry');

describe('deferred Sentry', () => {
  it('is a complete no-op without a DSN', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', '');
    const m = await load();
    m.initSentry();
    m.reportError(new Error('x'));
    expect(window.requestIdleCallback).not.toHaveBeenCalled();
    await m.whenSentryReady();
    expect(sentryMock.init).not.toHaveBeenCalled();
    expect(sentryMock.captureException).not.toHaveBeenCalled();
  });

  it('does NOT load the SDK before the browser is idle', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', DSN);
    const m = await load();
    m.initSentry();
    // The whole point: nothing heavy runs in the critical window.
    expect(sentryMock.init).not.toHaveBeenCalled();
    expect(window.requestIdleCallback).toHaveBeenCalledTimes(1);
  });

  it('buffers errors raised before the SDK loads and flushes them after', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', DSN);
    const m = await load();
    m.initSentry();

    m.reportError(new Error('from a boundary'), { componentStack: 'x' });
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('uncaught') }));
    expect(sentryMock.captureException).not.toHaveBeenCalled();

    idleCb();
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
    idleCb();
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
    idleCb();
    await m.whenSentryReady();
    expect(sentryMock.captureException.mock.calls.length).toBeLessThanOrEqual(20);
  });

  it('stops double-reporting once the SDK owns the global handlers', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', DSN);
    const m = await load();
    m.initSentry();
    idleCb();
    await m.whenSentryReady();
    sentryMock.captureException.mockClear();
    // Our pre-init listener must be gone; the SDK installs its own.
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('after') }));
    expect(sentryMock.captureException).not.toHaveBeenCalled();
  });

  it('falls back to a timer where requestIdleCallback does not exist (Safari)', async () => {
    delete window.requestIdleCallback;
    vi.useFakeTimers();
    vi.stubEnv('VITE_SENTRY_DSN', DSN);
    const m = await load();
    m.initSentry();
    expect(sentryMock.init).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1500);
    await m.whenSentryReady();
    expect(sentryMock.init).toHaveBeenCalledTimes(1);
  });
});
