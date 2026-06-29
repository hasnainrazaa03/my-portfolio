import type { VercelRequest, VercelResponse } from '@vercel/node';
/**
 * CSP violation report endpoint.
 *
 * Receives reports from browsers when content-security-policy directives
 * are violated. The policy in vercel.json is `Content-Security-Policy-Report-Only`
 * with `report-uri /api/csp-report`. We log the offending directive at warn
 * level (server-only) — no PII is collected and nothing is echoed to clients.
 *
 * Browsers POST one of two content-types here:
 *   - application/csp-report           (legacy, CSP Level 2)
 *   - application/reports+json         (Reporting API, CSP Level 3)
 *
 * We accept both. Always returns 204 No Content.
 */
import { applyCors } from './_lib/cors';
import { createDurableLimiter, getClientIp } from './_lib/rateLimit';

// Cheap rate-limit so a misbehaving extension can't flood logs.
const reportLimiter = createDurableLimiter({ windowMs: 60_000, max: 30, prefix: 'csp' });

// Cap payload size so we never log unbounded text.
const MAX_FIELD_LEN = 256;
const trunc = (s) =>
  typeof s === 'string' && s.length > MAX_FIELD_LEN ? `${s.slice(0, MAX_FIELD_LEN)}…` : s;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res, { methods: 'POST, OPTIONS', headers: 'Content-Type' });

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).end();

  const ip = getClientIp(req);
  const { limited } = await reportLimiter(ip);
  if (limited) return res.status(204).end();

  try {
    const body = req.body || {};
    // Both shapes have nested objects — normalise to a small subset.
    const report = body['csp-report'] || (Array.isArray(body) ? body[0]?.body : body) || {};

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
