import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * vercel.ts — the request and response types the handlers actually use.
 *
 * These replaced the `@vercel/node` package, which this repo imported in six
 * places for exactly two type names and nothing at runtime. Even its latest
 * release (13.0.1) pins advisory-carrying transitives — undici 5.28, an old
 * path-to-regexp and ajv — alongside ts-morph and a file tracer, so upgrading
 * could not clear them and npm's suggested "fix" was a ten-major downgrade.
 * Vercel's runtime compiles and serves these functions without the package;
 * it was here for types alone.
 *
 * The shapes describe what Vercel passes: Node's IncomingMessage and
 * ServerResponse, plus the body/query/cookies parsers and the Express-style
 * helpers Vercel adds. Kept deliberately to what this code touches.
 */
export interface VercelRequest extends IncomingMessage {
  /**
   * Parsed by Vercel's body helper from the content type. It is a lazy getter
   * that THROWS on malformed JSON, which is why handlers read it once inside a
   * try. Typed `unknown` rather than `any` so every use has to say what it
   * expects.
   */
  readonly body: unknown;
  query: Record<string, string | string[]>;
  cookies: Record<string, string>;
}

export interface VercelResponse extends ServerResponse {
  status(statusCode: number): VercelResponse;
  json(body: unknown): VercelResponse;
  send(body: unknown): VercelResponse;
}
