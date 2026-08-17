import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { useDarkMode } from '../hooks/useDarkMode';
import { useHighContrast } from '../hooks/useHighContrast';
import { ThemeContext } from './ThemeContext';
import type { ThemeValue } from './ThemeContext';

/**
 * The single owner of every theme preference — see ThemeContext.ts for why
 * calling the underlying hooks more than once is a correctness problem, not a
 * tidiness one.
 *
 * Split from the context/hook module purely so each file exports one kind of
 * thing; React Fast Refresh cannot handle a module that mixes components with
 * other exports.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useDarkMode();
  const [highContrast, setHighContrast, toggleHighContrast] = useHighContrast();

  const value = useMemo<ThemeValue>(
    () => ({
      isDark,
      setIsDark: (v: boolean) => setIsDark(v),
      toggleTheme: () => setIsDark((prev) => !prev),
      highContrast,
      setHighContrast: (v: boolean) => setHighContrast(v),
      toggleHighContrast,
    }),
    [isDark, setIsDark, highContrast, setHighContrast, toggleHighContrast],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export default ThemeProvider;
