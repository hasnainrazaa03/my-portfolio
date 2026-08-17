/**
 * chatServiceStream.test.js — client-side SSE consumption.
 *
 * The client must never end up worse off for having asked to stream. Every
 * failure mode here — a stream that stops early, a proxy that answers with
 * JSON, a malformed frame — has to land on either real text or the local
 * fallback, never on a blank bubble.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { getChatResponse } from '../services/chatService';

/** Build a Response whose body streams the given SSE text in fixed-size chunks. */
function sseResponse(text, chunkSize = 16) {
  const bytes = new TextEncoder().encode(text);
  let i = 0;
  return {
    ok: true,
    headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'text/event-stream' : null) },
    body: {
      getReader: () => ({
        read: async () => {
          if (i >= bytes.length) return { done: true, value: undefined };
          const slice = bytes.slice(i, i + chunkSize);
          i += chunkSize;
          return { done: false, value: slice };
        },
        cancel: async () => {},
      }),
    },
  };
}

const frame = (event, data) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

afterEach(() => vi.unstubAllGlobals());

describe('getChatResponse — streaming', () => {
  it('invokes onDelta for each chunk and returns the canonical reply', async () => {
    const sse =
      frame('delta', { text: 'I study ' }) +
      frame('delta', { text: 'at USC.' }) +
      frame('done', { reply: 'I study at USC. [Ask about: my roles?]' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse(sse)));

    const deltas = [];
    const reply = await getChatResponse([{ role: 'user', content: 'where?' }], {
      onDelta: (d) => deltas.push(d),
    });

    expect(deltas.join('')).toBe('I study at USC.');
    expect(reply).toBe('I study at USC. [Ask about: my roles?]');
  });

  it('reassembles frames split across chunk boundaries', async () => {
    const sse = frame('delta', { text: 'hello world' }) + frame('done', { reply: 'hello world.' });
    // One byte at a time — the worst case a proxy can produce.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse(sse, 1)));

    const deltas = [];
    const reply = await getChatResponse([{ role: 'user', content: 'hi' }], {
      onDelta: (d) => deltas.push(d),
    });
    expect(deltas.join('')).toBe('hello world');
    expect(reply).toBe('hello world.');
  });

  it('asks the server to stream only when onDelta is supplied', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ reply: 'plain' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await getChatResponse([{ role: 'user', content: 'hi' }]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).stream).toBe(false);

    await getChatResponse([{ role: 'user', content: 'hi' }], { onDelta: () => {} });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).stream).toBe(true);
  });

  it('handles a JSON answer to a stream request — an older deploy or a proxy', async () => {
    // Content-type is checked rather than assumed; parsing this as SSE would
    // yield nothing and blank the bubble.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ reply: 'plain json reply' }),
    }));

    const reply = await getChatResponse([{ role: 'user', content: 'hi' }], { onDelta: () => {} });
    expect(reply).toBe('plain json reply');
  });

  it('keeps the partial answer when the server reports a mid-stream failure', async () => {
    const sse =
      frame('delta', { text: 'I was explaining ' }) +
      frame('error', { error: 'upstream gone', partial: 'I was explaining something.' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse(sse)));

    const reply = await getChatResponse([{ role: 'user', content: 'hi' }], { onDelta: () => {} });
    expect(reply).toBe('I was explaining something.');
  });

  it('falls back locally when the stream errors before any text', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse(frame('error', { error: 'dead' }))));
    const reply = await getChatResponse([{ role: 'user', content: 'tell me about projects' }], {
      onDelta: () => {},
    });
    // getLocalResponse handles the projects keyword.
    expect(reply).toMatch(/project/i);
  });

  it('falls back locally when the stream ends without a done event', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse(frame('delta', { text: 'half' }))));
    const reply = await getChatResponse([{ role: 'user', content: 'skills?' }], { onDelta: () => {} });
    expect(reply).toMatch(/skill|Python/i);
  });

  it('ignores a malformed frame rather than aborting the stream', async () => {
    const sse = 'event: delta\ndata: {not json\n\n' + frame('done', { reply: 'survived.' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse(sse)));
    const reply = await getChatResponse([{ role: 'user', content: 'hi' }], { onDelta: () => {} });
    expect(reply).toBe('survived.');
  });

  it('falls back locally on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      headers: { get: () => 'application/json' },
      json: async () => ({ error: 'rate limited' }),
    }));
    const reply = await getChatResponse([{ role: 'user', content: 'contact' }], { onDelta: () => {} });
    expect(reply).toMatch(/reach me|email/i);
  });
});
