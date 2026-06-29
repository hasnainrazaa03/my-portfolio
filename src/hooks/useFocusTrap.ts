import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

/**
 * useFocusTrap — keyboard focus trap for modal/dialog surfaces.
 *
 * While active: Tab / Shift+Tab cycle within the container, Escape calls
 * `onEscape`, the first focusable is focused on mount, and focus is restored to
 * the previously-focused element on cleanup. Focusables are re-queried on every
 * Tab so dynamically-added controls are included.
 *
 * Attaches to `window` (matches the existing ProjectModal pattern + tests).
 * `onEscape` is held in a ref so an inline callback doesn't re-attach the
 * listener (and re-trigger initial focus) on every render.
 *
 * Extracted from duplicated logic in ProjectModal + Chatbot (F-11).
 */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface UseFocusTrapOptions {
  active?: boolean;
  onEscape?: () => void;
  restoreFocus?: boolean;
  initialFocus?: boolean;
}

export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  { active = true, onEscape, restoreFocus = true, initialFocus = true }: UseFocusTrapOptions = {},
): void {
  const onEscapeRef = useRef(onEscape);
  useEffect(() => { onEscapeRef.current = onEscape; }, [onEscape]);

  useEffect(() => {
    if (!active) return undefined;
    const container = ref.current;
    if (!container) return undefined;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onEscapeRef.current?.();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    let focusTimer: ReturnType<typeof setTimeout> | undefined;
    if (initialFocus) {
      focusTimer = setTimeout(() => {
        const firstFocusable = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        (firstFocusable ?? container).focus();
      }, 0);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (focusTimer) clearTimeout(focusTimer);
      if (restoreFocus && previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [ref, active, restoreFocus, initialFocus]);
}

export default useFocusTrap;
