import { useState, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';

/**
 * `useDarkMode()` — dark/light preference, persisted under `theme`.
 *
 * Initialises from localStorage, falling back to `prefers-color-scheme`.
 *
 * CALL THIS ONCE. It owns React state while writing to shared globals (the
 * `dark` class on <html>, and localStorage), so two callers would diverge. The
 * single call site is `ThemeProvider`; everything else reads `useTheme()`.
 *
 * Every localStorage access is guarded: Safari in private mode throws on
 * `setItem`, and an unguarded write inside this effect would escalate to the
 * app-level ErrorBoundary and blank the page — the same class of failure as the
 * WebGL crash, from a preference nobody would miss if it silently failed.
 */
const STORAGE_KEY = 'theme';

const readInitial = (): boolean => {
  if (typeof window === 'undefined') return true;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) return saved === 'dark';
  } catch {
    /* storage blocked — fall through to the media query */
  }
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return true;
  }
};

export const useDarkMode = (): [boolean, Dispatch<SetStateAction<boolean>>] => {
  const [isDark, setIsDark] = useState<boolean>(readInitial);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', isDark);
    try {
      window.localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch {
      /* storage unavailable in private mode — the class is what matters */
    }
  }, [isDark]);

  return [isDark, setIsDark];
};

export default useDarkMode;
