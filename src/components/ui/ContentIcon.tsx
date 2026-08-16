import type { LucideProps } from 'lucide-react';
import { getIcon } from './iconMap';
import type { IconKey } from './iconMap';

/**
 * ContentIcon — renders the lucide icon named by a content `IconKey`.
 *
 * Content (`constants.ts`) stores icons as plain strings so it stays free of
 * React and lucide imports — see the note in `iconMap.ts`. This is the UI-side
 * adapter that turns `icon: 'rocket'` back into a component.
 *
 * Lives in its own file rather than alongside `getIcon` because a module that
 * exports a component must export only components (react-refresh).
 */
export interface ContentIconProps extends Omit<LucideProps, 'ref'> {
  /** Key from the ICONS registry. Unknown keys fall back to a default glyph. */
  name: IconKey | string;
}

export default function ContentIcon({ name, ...props }: ContentIconProps) {
  const Icon = getIcon(name);
  return <Icon {...props} />;
}
