/**
 * `useHighContrast()` — opt-in high-contrast theme variant.
 *
 *   - Persists choice in `localStorage` under `pref:highContrast`.
 *   - Initialises from the OS-level `prefers-contrast: more` media query
 *     when the user hasn't set an explicit preference yet.
 *   - Toggles the `hc` class on `<html>` so Tailwind variants
 *     (`hc:bg-black`, `hc:text-white`, …) can adapt globally.
 *
 * The toggle is exposed through `Navigation.jsx`; consumers normally just
 * call `const [hc, setHc] = useHighContrast()`.
 */
import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

const STORAGE_KEY = 'pref:highContrast';

const readInitial = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') return true;
    if (stored === 'false') return false;
  } catch {
    /* localStorage blocked — fall through to media query */
  }
  if (window.matchMedia) {
    try {
      return window.matchMedia('(prefers-contrast: more)').matches;
    } catch {
      return false;
    }
  }
  return false;
};

export const useHighContrast = (): [boolean, Dispatch<SetStateAction<boolean>>, () => void] => {
  const [enabled, setEnabled] = useState<boolean>(readInitial);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('hc', enabled);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch {
      /* storage may be unavailable in private mode — ignore */
    }
  }, [enabled]);

  const toggle = useCallback(() => setEnabled((v) => !v), []);

  return [enabled, setEnabled, toggle];
};

export default useHighContrast;
