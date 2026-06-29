/**
 * Shared CORS / origin handling.
 *
 * Allows:
 *   - the configured production origin (ALLOWED_ORIGIN)
 *   - any *.vercel.app preview deployment
 *   - localhost during dev
 *
 * Echoes the matched origin (never returns "*") so requests with
 * credentials remain safe even though we don't currently send any.
 */

const DEFAULT_ORIGINS = ['https://hasnainrazaa.vercel.app'];

function parseConfiguredOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGIN || '';
  const list = raw
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  return list.length ? list : DEFAULT_ORIGINS;
}

const CONFIGURED = parseConfiguredOrigins();

export function isAllowedOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  const normalized = origin.replace(/\/+$/, '');
  if (CONFIGURED.includes(normalized)) return true;

  try {
    const url = new URL(normalized);
    // Vercel preview deployments
    if (url.hostname.endsWith('.vercel.app')) return true;
    // Local dev
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return true;
  } catch {
    return false;
  }
  return false;
}

interface RequestLike {
  headers?: { origin?: string } & Record<string, unknown>;
}

interface ResponseLike {
  setHeader(name: string, value: string): void;
}

export interface CorsOptions {
  methods?: string;
  headers?: string;
}

/**
 * Apply CORS + common security headers. Returns the matched origin
 * (or null if not allowed).
 */
export function applyCors(
  req: RequestLike,
  res: ResponseLike,
  { methods = 'POST, OPTIONS', headers = 'Content-Type' }: CorsOptions = {},
): string | null {
  const origin = req.headers?.origin;
  const allowed = isAllowedOrigin(origin) ? origin! : null;

  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', allowed);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', headers);
  res.setHeader('Access-Control-Expose-Headers', 'x-request-id');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');

  return allowed;
}
