import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Liveness probe. Deliberately imports NOTHING from ./_lib so it isolates
 * "the function runtime works at all" from "our shared modules load".
 *
 * `commit` is the git SHA this deployment was built from, so the scheduled
 * production check can tell whether main has actually deployed. A Vercel
 * deploy was once skipped without any signal — the push succeeded, CI passed,
 * and production kept serving the previous build. The SHA is public in the
 * repository already; exposing it here reveals nothing.
 */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ok: true,
    node: process.version,
    runtime: 'nodejs',
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
  });
}
