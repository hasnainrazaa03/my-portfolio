import { useEffect, useState } from 'react';

/**
 * useMediaQuery — subscribe to a CSS media query from JS.
 *
 * WHY: `hidden md:block` hides an element visually but React still MOUNTS it.
 * For `Hero3D` that meant every mobile visitor downloaded and executed the
 * three.js chunk (~127 KB gzip) to render something they could never see.
 * Gating the mount on the query — rather than on a CSS class — means the lazy
 * chunk is never requested below the breakpoint.
 *
 * The initial value is read synchronously during the first render so there is
 * no mount-then-unmount flash (which would defeat the point by fetching the
 * chunk anyway).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);

    // Re-sync in case the viewport changed between render and effect.
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

export default useMediaQuery;
