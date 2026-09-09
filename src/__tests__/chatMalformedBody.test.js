/**
 * chatMalformedBody.test.js — a bad JSON body is the caller's fault.
 *
 * On Vercel `req.body` is a lazy getter that THROWS on malformed JSON. That
 * first access sat inside the handler's main try, so `{` as a body produced a
 * 500 and a Sentry event — on the one route whose events are treated as worth
 * waking up for, at a rate anyone could sustain for free.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const sentryPost = vi.fn().mockResolvedValue({ status: 200 });

function makeRes() {
  const res = { statusCode: 200, headers: {}, body: undefined, ended: false };
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; return res; };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; res.ended = true; return res; };
  res.end = () => { res.ended = true; return res; };
  res.write = () => true;
  res.flushHeaders = () => {};
  return res;
}

function makeReq(bodyOrThrow) {
  const req = {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.7', origin: 'https://hasnainrazaa.vercel.app' },
    socket: { remoteAddress: '203.0.113.7' },
    on: () => req,
  };
  Object.defineProperty(req, 'body', {
    get() {
      if (bodyOrThrow instanceof Error) throw bodyOrThrow;
      return bodyOrThrow;
    },
  });
  return req;
}

beforeEach(() => {
  sentryPost.mockClear();
  vi.stubGlobal('fetch', sentryPost);
  process.env.SENTRY_DSN = 'https://abc@o1.ingest.us.sentry.io/1';
});

describe('POST /api/chat with a malformed body', () => {
  it('answers 400 and does NOT report to Sentry', async () => {
    const { default: handler } = await import('../../api/chat');
    const res = makeRes();
    await handler(makeReq(new Error('Invalid JSON')), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Invalid message');
    // No envelope POSTed: the only fetch a 400 path could make is Sentry's.
    expect(sentryPost).not.toHaveBeenCalled();
  });

  it('still answers 400 for a well-formed body with no message', async () => {
    const { default: handler } = await import('../../api/chat');
    const res = makeRes();
    await handler(makeReq({}), res);
    expect(res.statusCode).toBe(400);
  });
});
