/**
 * analyticsLog.test.js — server-side analytics writes.
 *
 * This module exists to delete a credential rather than protect one. Analytics
 * only ever stored chat (question, response) pairs, and /api/chat already holds
 * both — so the browser no longer posts anything, and
 * `VITE_ANALYTICS_WRITE_TOKEN` (which shipped readable inside the bundle) is
 * gone entirely.
 *
 * The properties pinned here: it never throws, it never stores a raw IP, and it
 * builds a PostgREST URL that does not 404.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { recordInteraction } from '../../api/_lib/analyticsLog';

const URL_BASE = 'https://proj.supabase.co';
let fetchMock;

beforeEach(() => {
  process.env.SUPABASE_URL = URL_BASE;
  process.env.SUPABASE_SERVICE_KEY = 'service-key';
  process.env.ANALYTICS_IP_SALT = 'test-salt';
  fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => '' });
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_KEY;
  delete process.env.ANALYTICS_IP_SALT;
});

const row = () => JSON.parse(fetchMock.mock.calls[0][1].body)[0];

describe('recordInteraction', () => {
  it('posts one row to the PostgREST table endpoint', async () => {
    await expect(recordInteraction({ question: 'q', response: 'a' })).resolves.toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe(`${URL_BASE}/rest/v1/jarvis_analytics`);
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
  });

  it('tolerates a trailing slash on SUPABASE_URL', async () => {
    // A pasted `.../rest/v1/` style URL is exactly how this was misconfigured
    // before; a doubled or `//`-joined path 404s from PostgREST.
    process.env.SUPABASE_URL = `${URL_BASE}/`;
    await recordInteraction({ question: 'q', response: 'a' });
    expect(fetchMock.mock.calls[0][0]).toBe(`${URL_BASE}/rest/v1/jarvis_analytics`);
  });

  it('authenticates with the service key in both required headers', () => {
    return recordInteraction({ question: 'q', response: 'a' }).then(() => {
      const { headers } = fetchMock.mock.calls[0][1];
      expect(headers.apikey).toBe('service-key');
      expect(headers.Authorization).toBe('Bearer service-key');
    });
  });

  it('hashes the IP and never stores it raw', async () => {
    await recordInteraction({ question: 'q', response: 'a', ip: '203.0.113.9' });
    const body = fetchMock.mock.calls[0][1].body;
    expect(body).not.toContain('203.0.113.9');
    expect(row().ip_address).toMatch(/^[a-f0-9]{16}$/);
  });

  it('redacts user agent and referrer', async () => {
    await recordInteraction({ question: 'q', response: 'a' });
    expect(row().user_agent).toBe('redacted');
    expect(row().referrer).toBe('redacted');
  });

  it('records "unknown" rather than failing when there is no IP', async () => {
    await recordInteraction({ question: 'q', response: 'a' });
    expect(row().ip_address).toBe('unknown');
  });

  it('truncates oversized question and response to the column limits', async () => {
    await recordInteraction({ question: 'q'.repeat(5000), response: 'a'.repeat(9000) });
    expect(row().question).toHaveLength(1000);
    expect(row().response).toHaveLength(4000);
  });

  it('truncates the session id and normalises a missing one to null', async () => {
    await recordInteraction({ question: 'q', response: 'a', sessionId: 's'.repeat(200) });
    expect(row().session_id).toHaveLength(64);

    fetchMock.mockClear();
    await recordInteraction({ question: 'q', response: 'a' });
    expect(row().session_id).toBeNull();
  });

  it('does nothing without Supabase configuration', async () => {
    delete process.env.SUPABASE_SERVICE_KEY;
    await expect(recordInteraction({ question: 'q', response: 'a' })).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a masked-placeholder credential', async () => {
    // Same failure mode that shipped once as 64 bullet characters.
    process.env.SUPABASE_SERVICE_KEY = '•'.repeat(64);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(recordInteraction({ question: 'q', response: 'a' })).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('skips empty interactions rather than writing blank rows', async () => {
    await expect(recordInteraction({ question: '', response: 'a' })).resolves.toBe(false);
    await expect(recordInteraction({ question: 'q', response: '   ' })).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns false instead of throwing when PostgREST rejects the row', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400, text: async () => 'bad column' });
    await expect(recordInteraction({ question: 'q', response: 'a' })).resolves.toBe(false);
  });

  it('returns false instead of throwing when the network fails', async () => {
    // Logging must never turn a delivered answer into a 500.
    fetchMock.mockRejectedValue(new Error('ECONNRESET'));
    await expect(recordInteraction({ question: 'q', response: 'a' })).resolves.toBe(false);
  });
});

/**
 * The point of this redesign is a security property, not a refactor, so assert
 * the property directly: nothing shipped to the browser may carry an analytics
 * write credential, and the client must not write analytics at all.
 *
 * A unit test of behaviour would not catch a reintroduction — someone adding
 * the fetch back would add passing tests alongside it. This checks the source.
 */
describe('no browser-readable analytics credential', () => {
  const read = async () => {
    const { readFileSync, readdirSync, statSync } = await import('node:fs');
    const { join, resolve } = await import('node:path');
    const files = [];
    const walk = (dir) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          if (entry !== '__tests__') walk(full);
        } else if (/\.(ts|tsx|js|jsx)$/.test(entry)) {
          files.push([full, readFileSync(full, 'utf8')]);
        }
      }
    };
    walk(resolve(process.cwd(), 'src'));
    return files;
  };

  it('no client source reads VITE_ANALYTICS_WRITE_TOKEN', async () => {
    const offenders = (await read())
      .filter(([, src]) => /import\.meta\.env\.VITE_ANALYTICS_WRITE_TOKEN|analyticsWriteToken/.test(src))
      .map(([f]) => f);
    expect(offenders).toEqual([]);
  });

  it('no client source sends the x-analytics-token header', async () => {
    const offenders = (await read())
      .filter(([, src]) => /['"]x-analytics-token['"]\s*:/.test(src))
      .map(([f]) => f);
    expect(offenders).toEqual([]);
  });

  it('the analytics service never POSTs', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const src = readFileSync(resolve(process.cwd(), 'src/services/analyticsService.ts'), 'utf8');
    // The GET admin read stays; only writes moved server-side.
    expect(src).not.toMatch(/method:\s*['"]POST['"]/);
  });
});

/**
 * Ordering guard.
 *
 * The first version of this write awaited recordInteraction AFTER res.end() /
 * after res.json(), to avoid adding latency. It produced ZERO rows across a
 * whole deploy: once the response is complete the platform is free to freeze
 * the instance, so post-response work is not guaranteed to run. Nothing caught
 * it — the write fails soft by design, so a hand-run SELECT was the only signal.
 *
 * No unit test here drives the handler against a real ServerResponse, so the
 * invariant is asserted against the source instead.
 */
describe('analytics write happens before the response completes', () => {
  const chatSrc = async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    return readFileSync(resolve(process.cwd(), 'api/chat.ts'), 'utf8');
  };

  it('streaming path records the row before res.end()', async () => {
    const src = await chatSrc();
    const stream = src.slice(
      src.indexOf('async function streamResponse'),
      src.indexOf('export default async function handler'),
    );
    const record = stream.indexOf('await recordInteraction');
    // The res.end() that terminates the SUCCESS path is the last one in the
    // function; the earlier ones are client-gone / error bail-outs.
    const finalEnd = stream.lastIndexOf('res.end()');
    expect(record).toBeGreaterThan(-1);
    expect(record).toBeLessThan(finalEnd);
  });

  it('JSON path records the row before it responds', async () => {
    const src = await chatSrc();
    const handler = src.slice(src.indexOf('export default async function handler'));
    const record = handler.indexOf('await recordInteraction');
    const respond = handler.indexOf('res.status(200).json({ reply');
    expect(record).toBeGreaterThan(-1);
    expect(respond).toBeGreaterThan(-1);
    expect(record).toBeLessThan(respond);
  });
});

/**
 * Guard: recorded questions must not carry the prompt-injection delimiters.
 *
 * The first production rows all read "<<USER>>\n…\n<<END_USER>>" because the
 * handler recorded the wrapped turn it sends to the model rather than the
 * question the visitor asked. Behavioural tests here cannot see that — the
 * write succeeds either way — so assert it at the call site.
 */
describe('recorded question is unwrapped', () => {
  it('both record sites strip the <<USER>> wrapper', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const src = readFileSync(resolve(process.cwd(), 'api/chat.ts'), 'utf8');

    const questionLines = src
      .split('\n')
      .filter((l) => /^\s*question:/.test(l));

    expect(questionLines.length).toBeGreaterThan(0);
    for (const line of questionLines) {
      expect(line, `raw turn content recorded: ${line.trim()}`).toMatch(/unwrapUser\(/);
    }
  });
});
