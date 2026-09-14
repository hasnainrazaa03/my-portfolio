/**
 * envExample.test.js — the template lists every variable the code reads.
 *
 * CONTRIBUTING told contributors to copy .env.example for months while the
 * file did not exist. This keeps it existing, complete, and free of values.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const example = readFileSync(resolve(root, '.env.example'), 'utf8');
const declared = new Set([...example.matchAll(/^([A-Z0-9_]+)=/gm)].map((m) => m[1]));

/** Variables Vercel injects itself; nobody sets these. */
const PLATFORM = new Set(['VERCEL_ENV', 'VERCEL_GIT_COMMIT_SHA', 'NODE_ENV', 'CI']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '__tests__' || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js)$/.test(name)) out.push(full);
  }
  return out;
}

const read = [
  ...walk(resolve(root, 'api')).flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/process\.env\.([A-Z0-9_]+)/g)].map((m) => m[1])),
  ...walk(resolve(root, 'src')).flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/import\.meta\.env\.(VITE_[A-Z0-9_]+)/g)].map((m) => m[1])),
];

describe('.env.example', () => {
  it('declares every variable the code reads', () => {
    const missing = [...new Set(read)].filter((v) => !PLATFORM.has(v) && !declared.has(v)).sort();
    expect(missing, `add to .env.example: ${missing.join(', ')}`).toEqual([]);
  });

  it('holds no secret values — only empty slots and safe defaults', () => {
    for (const line of example.split('\n')) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line);
      if (!m) continue;
      const [, name, value] = m;
      if (/KEY|TOKEN|SECRET|SALT|DSN/.test(name)) expect(value, name).toBe('');
    }
  });
});
