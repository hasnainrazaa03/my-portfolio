import {
  Code,
  Cpu,
  Database,
  Terminal,
  Wind,
  BookOpen,
  Rocket,
  Briefcase,
  GitBranch,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * iconMap — string key → lucide component.
 *
 * WHY THIS EXISTS (the T1.2 / F-48 follow-up): `constants.ts` used to import
 * lucide components directly and store them in `STATS[].icon` / `SKILLS[].icon`.
 * Because `api/chat.ts` imports `constants.ts` as the content single source of
 * truth, that pulled **React and lucide-react into the serverless bundle** —
 * measured at ~1 MB of the chat function's 1.5 MB, versus 484 KB for the LLM
 * layer alone. Pure dead weight on every cold start.
 *
 * Content now stores an `IconKey` string, and the mapping to a component lives
 * here in the UI layer. `constants.ts` is plain data: no React, no lucide.
 *
 * Adding an icon: import it, add one entry. The `IconKey` union is derived from
 * this object, so a typo in content is a compile error rather than a blank
 * space at runtime.
 */
export const ICONS = {
  code: Code,
  cpu: Cpu,
  database: Database,
  terminal: Terminal,
  wind: Wind,
  'book-open': BookOpen,
  rocket: Rocket,
  briefcase: Briefcase,
  'git-branch': GitBranch,
} satisfies Record<string, LucideIcon>;

export type IconKey = keyof typeof ICONS;

export const ICON_KEYS = Object.keys(ICONS) as IconKey[];

/** Runtime guard — used by the content schema, which validates plain data. */
export function isIconKey(value: unknown): value is IconKey {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(ICONS, value);
}

/**
 * Resolve a key to its component. Returns a safe default rather than undefined
 * so a bad key can never crash a section — `<undefined size={20} />` throws.
 */
export function getIcon(key: IconKey | string): LucideIcon {
  return isIconKey(key) ? ICONS[key] : Code;
}
