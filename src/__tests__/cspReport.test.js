/**
 * cspReport.test.js — CSP violation reports must actually be read.
 *
 * Browsers POST violations as `application/csp-report` or
 * `application/reports+json`. Vercel's body helper parses neither, so
 * `req.body` was undefined and every real violation was logged as five
 * `undefined`s — with an ENFORCING policy, real breakage went unnoticed.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';

function makeReq(contentType, rawJson, parsedBody) {
  const req = new EventEmitter();
  req.method = 'POST';
  req.headers = { 'content-type': contentType, 'x-forwarded-for': '198.51.100.5' };
  req.socket = { remoteAddress: '198.51.100.5' };
  req.body = parsedBody;
  req.setEncoding = () => {};
  // Replay the raw bytes the way Vercel's helper does after draining.
  setTimeout(() => { req.emit('data', rawJson); req.emit('end'); }, 0);
  return req;
}
function makeRes() {
  const res = { statusCode: 200, ended: false };
  res.setHeader = () => res; res.status = (c) => { res.statusCode = c; return res; };
  res.end = () => { res.ended = true; return res; }; res.json = () => res;
  return res;
}

afterEach(() => vi.restoreAllMocks());

describe('POST /api/csp-report', () => {
  it('reads the legacy application/csp-report body when the platform did not parse it', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { default: handler } = await import('../../api/csp-report');
    const raw = JSON.stringify({ 'csp-report': { 'violated-directive': 'img-src', 'blocked-uri': 'https://evil.example/x.png', 'document-uri': 'https://hasnainrazaa.vercel.app/' } });
    const res = makeRes();
    await handler(makeReq('application/csp-report', raw, undefined), res);
    expect(res.statusCode).toBe(204);
    const logged = warn.mock.calls.find((c) => c[0] === '[csp-report]')?.[1];
    expect(logged).toBeDefined();
    expect(logged.directive).toBe('img-src');
    expect(logged.blocked).toContain('evil.example');
  });

  it('reads the Reporting API array shape too', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { default: handler } = await import('../../api/csp-report');
    const raw = JSON.stringify([{ type: 'csp-violation', body: { effectiveDirective: 'script-src', blockedURL: 'inline' } }]);
    await handler(makeReq('application/reports+json', raw, undefined), makeRes());
    const logged = warn.mock.calls.find((c) => c[0] === '[csp-report]')?.[1];
    expect(logged.directive).toBe('script-src');
  });

  it('never throws on garbage', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { default: handler } = await import('../../api/csp-report');
    const res = makeRes();
    await handler(makeReq('application/csp-report', '{not json', undefined), res);
    expect(res.statusCode).toBe(204);
    expect(res.ended).toBe(true);
  });
});
