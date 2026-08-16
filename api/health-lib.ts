import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isAllowedOrigin } from './_lib/cors';
import { createDurableLimiter } from './_lib/rateLimit';

/**
 * Second probe: same as /api/health but exercises the shared _lib modules that
 * every real handler imports. If /api/health is 200 and this is 500, the fault
 * is in _lib rather than the runtime.
 */
const limiter = createDurableLimiter({ windowMs: 60_000, max: 60, prefix: 'health' });

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const { limited } = await limiter('probe');
  res.status(200).json({ ok: true, node: process.version, corsOk: isAllowedOrigin('http://localhost:5173'), limited });
}
