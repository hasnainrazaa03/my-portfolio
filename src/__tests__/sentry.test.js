/**
 * sentry.test.js — serverless error reporting.
 *
 * This is a hand-rolled Sentry envelope POST rather than `@sentry/node`, which
 * pulls OpenTelemetry in and took the chat lambda from 516 KB to 1.9 MB. The
 * tradeoff is that the wire format is now our responsibility, so it is pinned
 * here — along with the property that matters most: reporting an error must
 * never itself throw, or a 502 becomes a crash.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { captureServerError } from '../../api/_lib/sentry';

const DSN = 'https://abc123@o999.ingest.us.sentry.io/456';

let fetchMock;
beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue({ status: 200 });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.SENTRY_DSN;
});

describe('captureServerError', () => {
  it('does nothing without a DSN', async () => {
    await captureServerError(new Error('boom'));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts to the envelope endpoint derived from the DSN', async () => {
    process.env.SENTRY_DSN = DSN;
    await captureServerError(new Error('boom'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('https://o999.ingest.us.sentry.io/api/456/envelope/');
    expect(url).toContain('sentry_key=abc123');
    expect(init.headers['Content-Type']).toBe('application/x-sentry-envelope');
  });

  it('sends a three-line envelope whose payload describes the error', async () => {
    process.env.SENTRY_DSN = DSN;
    await captureServerError(new TypeError('bad input'), {
      requestId: 'req-1',
      route: '/api/chat',
    });

    const lines = fetchMock.mock.calls[0][1].body.split('\n');
    expect(lines).toHaveLength(3);

    expect(JSON.parse(lines[1])).toEqual({ type: 'event' });

    const event = JSON.parse(lines[2]);
    expect(event.exception.values[0].type).toBe('TypeError');
    expect(event.exception.values[0].value).toBe('bad input');
    expect(event.tags.request_id).toBe('req-1');
    expect(event.tags.route).toBe('/api/chat');
    expect(event.level).toBe('error');
    // Envelope header event_id must match the payload's, or Sentry drops it.
    expect(JSON.parse(lines[0]).event_id).toBe(event.event_id);
  });

  it('parses the stack into frames', async () => {
    process.env.SENTRY_DSN = DSN;
    await captureServerError(new Error('with stack'));
    const event = JSON.parse(fetchMock.mock.calls[0][1].body.split('\n')[2]);
    const frames = event.exception.values[0].stacktrace?.frames;
    expect(Array.isArray(frames)).toBe(true);
    expect(frames.length).toBeGreaterThan(0);
    expect(frames[0]).toHaveProperty('filename');
    expect(frames[0]).toHaveProperty('lineno');
  });

  it('never sends a request body — /api/chat carries visitor messages', async () => {
    process.env.SENTRY_DSN = DSN;
    await captureServerError(new Error('boom'), { extra: { safe: 'value' } });
    const event = JSON.parse(fetchMock.mock.calls[0][1].body.split('\n')[2]);
    expect(event.request).toBeUndefined();
    expect(event.server_name).toBeUndefined();
  });

  it('swallows a malformed DSN rather than throwing', async () => {
    process.env.SENTRY_DSN = 'not-a-dsn';
    await expect(captureServerError(new Error('boom'))).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('swallows a failing transport — reporting must not break the response', async () => {
    process.env.SENTRY_DSN = DSN;
    fetchMock.mockRejectedValue(new Error('network down'));
    await expect(captureServerError(new Error('boom'))).resolves.toBeUndefined();
  });

  it('accepts a non-Error throwable', async () => {
    process.env.SENTRY_DSN = DSN;
    await captureServerError('a bare string');
    const event = JSON.parse(fetchMock.mock.calls[0][1].body.split('\n')[2]);
    expect(event.exception.values[0].value).toBe('a bare string');
  });
});
