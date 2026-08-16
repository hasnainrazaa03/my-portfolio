import { createElement } from 'react';
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
  // `createElement` rather than binding to a capitalized local and rendering
  // <Icon />: the React Compiler lint reads that binding as defining a
  // component during render ("Cannot create components during render"), which
  // would opt this component out of compilation. The lookup is a plain read
  // from a module-level frozen registry — no component is being created.
  return createElement(getIcon(name), props);
}
