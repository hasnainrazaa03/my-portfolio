/**
 * Serverless error reporting — a direct Sentry envelope POST, no SDK.
 *
 * WHY NOT `@sentry/node`: it pulls OpenTelemetry in (measured: 358 references,
 * 5.2 MB on disk) and took the chat lambda from 516 KB to 1.9 MB. This project
 * already decided that tradeoff once — the durable rate limiter talks to
 * Upstash over `fetch` rather than adding a client, precisely to keep the
 * functions small and their cold starts quick. Reporting an error does not
 * justify tripling every function.
 *
 * The Sentry ingest envelope format is a documented, stable HTTP contract:
 *   POST {protocol}://{host}/api/{project}/envelope/?sentry_key={key}&sentry_version=7
 *   <header json>\n<item header json>\n<payload json>
 *
 * Gated on `SENTRY_DSN`; with no DSN every function here is a no-op.
 */

interface ParsedDsn {
  url: string;
  key: string;
}

/** DSN shape: https://<public_key>@<host>/<project_id> */
function parseDsn(dsn: string): ParsedDsn | null {
  try {
    const u = new URL(dsn);
    const projectId = u.pathname.replace(/^\//, '');
    if (!u.username || !projectId) return null;
    return {
      url: `${u.protocol}//${u.host}/api/${projectId}/envelope/`,
      key: u.username,
    };
  } catch {
    return null;
  }
}

/** Turn a V8 stack string into Sentry frames (innermost last, as Sentry expects). */
function toFrames(stack: string | undefined) {
  if (!stack) return undefined;
  const frames = stack
    .split('\n')
    .slice(1)
    .map((line) => line.match(/at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/))
    .filter((m): m is RegExpMatchArray => Boolean(m))
    .map((m) => ({
      function: m[1] || '?',
      filename: m[2],
      lineno: Number(m[3]),
      colno: Number(m[4]),
      in_app: !m[2].includes('node_modules'),
    }))
    .reverse();
  return frames.length ? { frames } : undefined;
}

/**
 * Walk an error's `cause` chain into a readable summary.
 *
 * Node's fetch reports every connection-level failure as the same opaque
 * `TypeError: fetch failed`. The actionable part — ENOTFOUND vs ECONNREFUSED vs
 * a TLS error — lives in `.cause`, and without it a Sentry issue says only that
 * something network-shaped went wrong. A real one read exactly that, and the
 * answer (a paused database, so DNS no longer resolved) took a separate manual
 * dig to find.
 */
function causeChain(error: unknown, depth = 4): string[] {
  const chain: string[] = [];
  let current: unknown = error;
  for (let i = 0; i < depth; i++) {
    const cause = (current as { cause?: unknown } | null)?.cause;
    if (!cause) break;
    if (cause instanceof Error) {
      const code = (cause as NodeJS.ErrnoException).code;
      chain.push(`${cause.name}: ${cause.message}${code ? ` (${code})` : ''}`);
    } else {
      chain.push(String(cause));
    }
    current = cause;
  }
  return chain;
}

/** The innermost errno-style code, which is the part worth putting in a title. */
function rootCode(error: unknown, depth = 4): string | undefined {
  let current: unknown = error;
  let code: string | undefined;
  for (let i = 0; i <= depth; i++) {
    const c = (current as NodeJS.ErrnoException | null)?.code;
    if (typeof c === 'string') code = c;
    const next = (current as { cause?: unknown } | null)?.cause;
    if (!next) break;
    current = next;
  }
  return code;
}

export interface CaptureContext {
  requestId?: string;
  route?: string;
  extra?: Record<string, unknown>;
}

/**
 * Report a handler failure. Fire-and-forget by design at the call site, but
 * returns the promise so a handler can await it before the lambda freezes.
 *
 * NEVER throws: a failure to report must not turn a 502 into a crash.
 */
export async function captureServerError(
  error: unknown,
  context: CaptureContext = {},
): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  const parsed = parseDsn(dsn);
  if (!parsed) return;

  const err = error instanceof Error ? error : new Error(String(error));
  const eventId = crypto.randomUUID().replace(/-/g, '');

  const chain = causeChain(err);
  const code = rootCode(err);
  // Put the errno in the title: "fetch failed" and "fetch failed (ENOTFOUND)"
  // are different problems, and only one of them is a paused database.
  const value = code ? `${err.message} (${code})` : err.message;

  const event = {
    event_id: eventId,
    timestamp: Date.now() / 1000,
    platform: 'node',
    level: 'error',
    logger: 'serverless',
    environment: process.env.VERCEL_ENV || 'development',
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    server_name: undefined, // never leak instance identifiers
    tags: {
      ...(context.requestId ? { request_id: context.requestId } : {}),
      ...(context.route ? { route: context.route } : {}),
    },
    // Deliberately no request body: /api/chat carries visitor messages.
    extra: {
      ...context.extra,
      ...(chain.length ? { cause_chain: chain } : {}),
    },
    exception: {
      values: [
        {
          type: err.name,
          value,
          stacktrace: toFrames(err.stack),
        },
      ],
    },
  };

  const body =
    JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() }) +
    '\n' +
    JSON.stringify({ type: 'event' }) +
    '\n' +
    JSON.stringify(event);

  try {
    await fetch(`${parsed.url}?sentry_key=${parsed.key}&sentry_version=7`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-sentry-envelope' },
      body,
      // A lambda can be frozen the moment it responds; keep this short so it
      // cannot hold the request open.
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    /* reporting must never fail the request */
  }
}

/**
 * Kept so handlers read the same either way. The envelope POST is awaited
 * directly, so there is no queue to drain — this is a no-op.
 */
export async function flushSentry(): Promise<void> {
  /* no queue: captureServerError awaits its own POST */
}
