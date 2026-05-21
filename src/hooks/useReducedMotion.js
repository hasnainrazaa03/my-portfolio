/**
 * `useReducedMotion()` — single source of truth for the
 * `prefers-reduced-motion` media query. Components should prefer this hook
 * over inlining their own matchMedia listeners so behaviour stays
 * consistent across the app and we have one place to test.
 *
 * Returns `true` when the user (or OS) has requested reduced motion. Falls
 * back to `false` during SSR / when matchMedia is unavailable.
 */
import { useEffect, useState } from 'react';

const MEDIA = '(prefers-reduced-motion: reduce)';

const getInitial = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try {
    return window.matchMedia(MEDIA).matches;
  } catch {
    return false;
  }
};

export const useReducedMotion = () => {
  const [reduced, setReduced] = useState(getInitial);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mql = window.matchMedia(MEDIA);
    const onChange = (e) => setReduced(e.matches);
    // Safari < 14 only supports the legacy `addListener` API.
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange);
      else mql.removeListener(onChange);
    };
  }, []);

  return reduced;
};

export default useReducedMotion;
