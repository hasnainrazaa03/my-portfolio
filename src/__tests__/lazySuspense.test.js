/**
 * lazySuspense.test.js — every lazy() component must render inside <Suspense>.
 *
 * A change intended to wrap the lazy Chatbot in Suspense silently failed to
 * land (an indentation mismatch in a scripted edit), and the widget rendered
 * with no boundary above it for several deploys. It only worked because React
 * tolerates an unbounded suspension on initial render — nothing in the suite
 * would have noticed if that tolerance changed. This asserts the structure.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

/** True when the JSX at `pos` sits inside an open <Suspense> in this file. */
function insideSuspense(source, pos) {
  const before = source.slice(0, pos);
  const opens = (before.match(/<Suspense\b/g) || []).length;
  const closes = (before.match(/<\/Suspense>/g) || []).length;
  return opens > closes;
}

describe('App.tsx', () => {
  const lazyNames = [...src.matchAll(/const\s+(\w+)\s*=\s*lazy\(/g)].map((m) => m[1]);

  it('declares lazy components to check', () => {
    expect(lazyNames.length).toBeGreaterThan(0);
  });

  it.each(lazyNames)('renders lazy <%s> inside a Suspense boundary', (name) => {
    const uses = [...src.matchAll(new RegExp(`<${name}\\b`, 'g'))].map((m) => m.index);
    expect(uses.length, `${name} is declared lazy but never rendered`).toBeGreaterThan(0);
    for (const pos of uses) {
      expect(insideSuspense(src, pos), `<${name}> at offset ${pos} has no <Suspense> above it`).toBe(true);
    }
  });
});
