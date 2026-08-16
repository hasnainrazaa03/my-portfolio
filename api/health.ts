import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Liveness probe. Deliberately imports NOTHING from ./_lib so it isolates
 * "the function runtime works at all" from "our shared modules load".
 */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ ok: true, node: process.version, runtime: 'nodejs' });
}
