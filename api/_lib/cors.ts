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

/**
 * Host prefixes whose *.vercel.app preview deployments are trusted.
 *
 * Previously this accepted ANY `*.vercel.app` host, which meant anyone could
 * deploy a page to Vercel and drive this project's LLM spend from a browser.
 * Preview URLs are `<project>-<hash>-<scope>.vercel.app` /
 * `<project>-git-<branch>-<scope>.vercel.app`, so matching on the project
 * prefix keeps previews working while closing that door.
 *
 * Override with VERCEL_PREVIEW_PREFIX (comma-separated) if the project is
 * renamed — a wrong prefix costs preview-only CORS, never production.
 */
const DEFAULT_PREVIEW_PREFIXES = ['hasnainrazaa', 'my-portfolio'];

function parseList(raw: string | undefined, fallback: string[]): string[] {
  const list = (raw || '')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  return list.length ? list : fallback;
}

const CONFIGURED = parseList(process.env.ALLOWED_ORIGIN, DEFAULT_ORIGINS);
const PREVIEW_PREFIXES = parseList(
  process.env.VERCEL_PREVIEW_PREFIX,
  DEFAULT_PREVIEW_PREFIXES,
).map((p) => p.toLowerCase());

export function isAllowedOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  const normalized = origin.replace(/\/+$/, '');
  if (CONFIGURED.includes(normalized)) return true;

  try {
    const url = new URL(normalized);
    const host = url.hostname.toLowerCase();

    // Vercel preview deployments for THIS project only.
    if (host.endsWith('.vercel.app')) {
      const label = host.slice(0, -'.vercel.app'.length);
      return PREVIEW_PREFIXES.some(
        (prefix) => label === prefix || label.startsWith(`${prefix}-`),
      );
    }

    // Local dev
    if (host === 'localhost' || host === '127.0.0.1') return true;
  } catch {
    return false;
  }
  return false;
}

interface RequestLike {
  headers?: Record<string, string | string[] | undefined>;
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
  const rawOrigin = req.headers?.origin;
  const origin = typeof rawOrigin === 'string' ? rawOrigin : undefined;
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
