import { createContext, useContext } from 'react';

/**
 * ThemeContext — one owner for every theme preference.
 *
 * WHY THIS EXISTS (it is not only about prop drilling)
 * ----------------------------------------------------
 * `useDarkMode` and `useHighContrast` each hold their own `useState` while
 * writing to SHARED global state — the `dark` / `hc` classes on <html> and
 * localStorage. That combination only works while each hook has exactly one
 * caller. A second caller gets its own React state, and the two copies diverge
 * the moment either one changes: the class and the storage key would reflect
 * whichever component rendered last, while the other still renders from a stale
 * boolean.
 *
 * Nothing had tripped it yet, purely because `useHighContrast` happened to be
 * called in exactly one place (Navigation) and `isDark` happened to be drilled
 * from App. Both are one careless import away from breaking, and the failure
 * would look like "the toggle works but the page doesn't update", which is a
 * miserable thing to debug.
 *
 * So the hooks are now called EXACTLY ONCE, here. Everything else reads
 * `useTheme()`. The hooks keep their own unit tests and their existing
 * localStorage keys, so no visitor loses a saved preference.
 */

export interface ThemeValue {
  isDark: boolean;
  toggleTheme: () => void;
  setIsDark: (value: boolean) => void;
  highContrast: boolean;
  toggleHighContrast: () => void;
  setHighContrast: (value: boolean) => void;
}

export const ThemeContext = createContext<ThemeValue | null>(null);

/**
 * Read the current theme.
 *
 * Throws outside a provider rather than returning a default. A silent default
 * would render a component in light mode inside a dark page and look like a
 * styling bug anywhere but the actual cause.
 */
export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a <ThemeProvider>');
  }
  return ctx;
}
