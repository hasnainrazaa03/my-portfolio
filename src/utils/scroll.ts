/**
 * scrollToSection — native smooth-scroll to an element by id, honoring
 * `prefers-reduced-motion`. Replaces react-scroll; sections set
 * `scroll-margin-top` globally in index.css so no numeric offset is needed.
 *
 * Single source of truth — previously duplicated verbatim in Hero.jsx and
 * Navigation.jsx.
 */
export function scrollToSection(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
}
