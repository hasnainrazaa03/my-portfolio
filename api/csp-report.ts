import type { VercelRequest, VercelResponse } from '@vercel/node';
/**
 * CSP violation report endpoint.
 *
 * Receives reports from browsers when content-security-policy directives
 * are violated. The policy in vercel.json is `Content-Security-Policy-enforcing`
 * with `report-uri /api/csp-report`. We log the offending directive at warn
 * level (server-only) — no PII is collected and nothing is echoed to clients.
 *
 * Browsers POST one of two content-types here:
 *   - application/csp-report           (legacy, CSP Level 2)
 *   - application/reports+json         (Reporting API, CSP Level 3)
 *
 * We accept both. Always returns 204 No Content.
 */
import { applyCors } from './_lib/cors.js';
import { createDurableLimiter, getClientIp } from './_lib/rateLimit.js';

// Cheap rate-limit so a misbehaving extension can't flood logs.
const reportLimiter = createDurableLimiter({ windowMs: 60_000, max: 30, prefix: 'csp' });

// Cap payload size so we never log unbounded text.
const MAX_FIELD_LEN = 256;
const trunc = (s: unknown): unknown =>
  typeof s === 'string' && s.length > MAX_FIELD_LEN ? `${s.slice(0, MAX_FIELD_LEN)}…` : s;

/** Union of the CSP Level 2 (`csp-report`) and Level 3 (Reporting API) shapes. */
interface CspReportBody {
  'violated-directive'?: unknown;
  effectiveDirective?: unknown;
  'blocked-uri'?: unknown;
  blockedURL?: unknown;
  'document-uri'?: unknown;
  documentURL?: unknown;
  'source-file'?: unknown;
  sourceFile?: unknown;
  'line-number'?: unknown;
  lineNumber?: unknown;
}

/**
 * Browsers POST violations as `application/csp-report` (legacy) or
 * `application/reports+json` (Reporting API). Vercel's body helper parses only
 * json / urlencoded / text / octet-stream, so for BOTH of those content types
 * `req.body` is undefined — and this handler logged every real violation as
 * five `undefined`s. The helper replays the raw bytes on `data`/`end`, so they
 * can still be read here. Capped: a report is a few hundred bytes.
 */
function readRawBody(req: VercelRequest, limit = 64 * 1024): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => {
      if (data.length < limit) data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', () => resolve(''));
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res, { methods: 'POST, OPTIONS', headers: 'Content-Type' });

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).end();

  const ip = getClientIp(req);
  const { limited } = await reportLimiter(ip);
  if (limited) return res.status(204).end();

  try {
    let parsed: unknown = req.body;
    if (parsed === undefined || parsed === null) {
      const raw = await readRawBody(req);
      parsed = raw ? JSON.parse(raw) : {};
    }
    const body = (parsed || {}) as Record<string, unknown> | unknown[];
    // Both shapes have nested objects — normalise to a small subset.
    const report = (Array.isArray(body)
      ? (body[0] as { body?: CspReportBody } | undefined)?.body
      : ((body as Record<string, unknown>)['csp-report'] as CspReportBody) || body) as CspReportBody ?? {};

    console.warn('[csp-report]', {
      directive: trunc(report['violated-directive'] || report.effectiveDirective),
      blocked: trunc(report['blocked-uri'] || report.blockedURL),
      docUri: trunc(report['document-uri'] || report.documentURL),
      source: trunc(report['source-file'] || report.sourceFile),
      line: report['line-number'] || report.lineNumber,
    });
  } catch {
    // Never throw — reporting must be best-effort.
  }

  return res.status(204).end();
}
