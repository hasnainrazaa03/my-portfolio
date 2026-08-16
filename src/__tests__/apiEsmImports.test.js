/**
 * apiEsmImports.test.js — guards the ESM specifier rule for serverless handlers.
 *
 * THE OUTAGE THIS PREVENTS: every endpoint under api/ returned
 * FUNCTION_INVOCATION_FAILED in production for an extended period:
 *
 *   Cannot find module '/var/task/api/_lib/cors'
 *   imported from /var/task/api/chat.js
 *
 * Vercel transpiles each handler to .js individually rather than bundling.
 * package.json declares "type": "module", so the output is ESM — and Node ESM
 * does NOT resolve extensionless relative specifiers. Every `./_lib/cors`
 * import therefore failed at module load, before a single line of handler code
 * ran.
 *
 * It stayed invisible for two reasons worth remembering:
 *   1. Local esbuild bundling passes, because bundling resolves the specifier
 *      at build time. That was the existing verification step.
 *   2. Every caller fails soft — chatService falls back to canned responses —
 *      so the UI looked healthy while the API was entirely dead.
 *
 * TypeScript maps './_lib/cors.js' back to the .ts source, so the extension
 * costs nothing at authoring time.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const API_DIR = resolve(process.cwd(), 'api');

function tsFilesUnder(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return tsFilesUnder(full);
    return full.endsWith('.ts') ? [full] : [];
  });
}

/** Relative specifiers in `import ... from '...'`, `export ... from`, `import('...')`. */
function relativeSpecifiers(source) {
  const patterns = [
    /(?:^|\s)(?:import|export)\b[^;]*?\sfrom\s+['"](\.[^'"]*)['"]/g,
    /\bimport\(\s*['"](\.[^'"]*)['"]\s*\)/g,
  ];
  return patterns.flatMap((re) => [...source.matchAll(re)].map((m) => m[1]));
}

describe('api/ ESM specifiers', () => {
  const files = tsFilesUnder(API_DIR);

  it('finds handler sources to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map((f) => [f.replace(`${process.cwd()}/`, ''), f]))(
    '%s uses explicit .js extensions on every relative import',
    (rel, full) => {
      const offenders = relativeSpecifiers(readFileSync(full, 'utf8')).filter(
        (spec) => !spec.endsWith('.js'),
      );

      expect(
        offenders,
        `${rel} has extensionless relative import(s): ${offenders.join(', ')}.\n` +
          `Node ESM cannot resolve these at runtime on Vercel — the function will ` +
          `fail at module load with FUNCTION_INVOCATION_FAILED. Append ".js" ` +
          `(TypeScript maps it back to the .ts source).`,
      ).toEqual([]);
    },
  );
});
