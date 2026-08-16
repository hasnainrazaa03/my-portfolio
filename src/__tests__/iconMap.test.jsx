/**
 * iconMap.test.jsx — the content↔icon contract.
 *
 * Content stores icons as plain string keys rather than imported lucide
 * components. That is what keeps React and lucide-react OUT of the serverless
 * bundle (api/chat.ts imports constants.ts as the content SSOT — the chat
 * lambda went from 1.5 MB to 518 KB when this changed).
 *
 * The tradeoff is that a typo'd key is no longer a compile error in the data
 * file itself, so these lock the contract down.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render } from '@testing-library/react';
import { ICONS, ICON_KEYS, getIcon, isIconKey } from '../components/ui/iconMap';
import ContentIcon from '../components/ui/ContentIcon';
import { STATS, SKILLS } from '../constants';

describe('iconMap', () => {
  it('every STATS icon key resolves', () => {
    for (const stat of STATS) {
      expect(isIconKey(stat.icon), `STATS "${stat.label}" -> "${stat.icon}"`).toBe(true);
    }
  });

  it('every SKILLS icon key resolves', () => {
    for (const group of SKILLS) {
      expect(isIconKey(group.icon), `SKILLS "${group.category}" -> "${group.icon}"`).toBe(true);
    }
  });

  it('rejects unknown keys', () => {
    expect(isIconKey('definitely-not-an-icon')).toBe(false);
    expect(isIconKey(undefined)).toBe(false);
    expect(isIconKey(42)).toBe(false);
  });

  it('falls back to a component rather than undefined for a bad key', () => {
    // `<undefined size={20} />` throws; a bad key must not take a section down.
    const Fallback = getIcon('nope');
    expect(typeof Fallback === 'function' || typeof Fallback === 'object').toBe(true);
    expect(() => render(<ContentIcon name="nope" size={20} />)).not.toThrow();
  });

  it('renders an svg for every registered key', () => {
    for (const key of ICON_KEYS) {
      const { container, unmount } = render(<ContentIcon name={key} size={20} />);
      expect(container.querySelector('svg'), `icon "${key}"`).toBeInTheDocument();
      unmount();
    }
  });

  it('keeps ICON_KEYS in step with ICONS', () => {
    expect(ICON_KEYS.sort()).toEqual(Object.keys(ICONS).sort());
  });
});

describe('content layer purity', () => {
  it('stores icons as strings, not components', () => {
    for (const stat of STATS) expect(typeof stat.icon).toBe('string');
    for (const group of SKILLS) expect(typeof group.icon).toBe('string');
  });

  it('constants.ts imports no UI libraries', () => {
    // The load-bearing guard. api/chat.ts imports constants.ts as the content
    // SSOT, so any UI import here ships to the serverless runtime: re-adding
    // lucide put ~1 MB of React + lucide into the chat lambda (1.5 MB vs the
    // 518 KB it is without them).
    const src = readFileSync(resolve(process.cwd(), 'src/constants.ts'), 'utf8');
    const uiImports = [...src.matchAll(/^\s*import\s[^;]*?from\s+['"]([^'"]+)['"]/gm)]
      .map((m) => m[1])
      .filter((spec) => /^(react|react-dom|lucide-react|framer-motion)/.test(spec));

    expect(
      uiImports,
      `src/constants.ts must stay pure data — it is imported by api/chat.ts, so ` +
        `these get bundled into the serverless function.`,
    ).toEqual([]);
  });
});
