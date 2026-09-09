import { useState } from 'react';

/** The subset of the Network Information API this reads. Chromium-only; absent elsewhere. */
interface ConnectionLike {
  saveData?: boolean;
  effectiveType?: string;
}

/**
 * True when the visitor has asked for less data (the browser's Data Saver /
 * Lite mode sets `saveData`), or the link is slow enough that decoration is
 * not worth its bytes.
 *
 * `effectiveType` is the browser's own estimate from recent round trips, so
 * "3g" is included: on such a link the 127 KB three.js chunk behind the hero
 * is a second or more of loading for something the CSS fallback already
 * stands in for. Browsers without the API answer false — nothing changes for
 * them.
 */
export function prefersReducedData(
  nav: { connection?: ConnectionLike } = typeof navigator === 'undefined'
    ? {}
    : (navigator as Navigator & { connection?: ConnectionLike }),
): boolean {
  const c = nav.connection;
  if (!c) return false;
  if (c.saveData === true) return true;
  return typeof c.effectiveType === 'string' && /^(slow-2g|2g|3g)$/.test(c.effectiveType);
}

/**
 * Read once, at mount. The answer gates whether a chunk is requested at all;
 * re-evaluating later and flipping to "load it" would fetch the chunk anyway,
 * and flipping to "drop it" would blank a canvas the visitor is looking at.
 */
export function useDataSaver(): boolean {
  const [reduced] = useState(() => prefersReducedData());
  return reduced;
}

export default useDataSaver;
