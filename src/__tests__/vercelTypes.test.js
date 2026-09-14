/**
 * vercelTypes.test.js — handlers use local types, not @vercel/node.
 *
 * The package supplied two type names and nothing at runtime, yet pulled in 81
 * packages including advisory-carrying undici, path-to-regexp and ajv that even
 * its latest release could not shed. It was replaced by api/_lib/vercel.ts.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

describe('Vercel handler types', () => {
  it('are not provided by the @vercel/node package', () => {
    expect(pkg.dependencies?.['@vercel/node']).toBeUndefined();
    expect(pkg.devDependencies?.['@vercel/node']).toBeUndefined();
  });

  it('come from api/_lib/vercel.ts in every handler', () => {
    for (const f of readdirSync(resolve(root, 'api')).filter((n) => n.endsWith('.ts'))) {
      const src = readFileSync(resolve(root, 'api', f), 'utf8');
      expect(src, f).not.toMatch(/from '@vercel\/node'/);
      if (/VercelRequest|VercelResponse/.test(src)) expect(src, f).toMatch(/from '\.\/_lib\/vercel\.js'/);
    }
  });

  it('keep the parsed body `unknown`, so every read states its expected shape', () => {
    expect(readFileSync(resolve(root, 'api/_lib/vercel.ts'), 'utf8')).toMatch(/readonly body: unknown;/);
  });
});
