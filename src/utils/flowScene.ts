import { fromView, streamline, surface, toView, type Airfoil, type Complex } from './potentialFlow';

/**
 * flowScene.ts — the still parts of the hero picture: the view window, and
 * the streamlines plus airfoil outline for one angle of attack, in view
 * coordinates (freestream left to right, nose up for positive α).
 *
 * Shared by the animated canvas and the static SVG so both draw the same
 * picture.
 */

export const ALPHA_MIN = -6;
export const ALPHA_MAX = 16;
export const ALPHA_DEFAULT = 4;
/** World window in units of a: the airfoil spans x ∈ [−2, 2]. */
export const VIEW = { left: -4.2, right: 6.8, halfHeight: 3.0 };
export const STREAMLINES = 26;

export const rad = (d: number): number => (d * Math.PI) / 180;

/** Streamlines and the airfoil outline in view space for one angle. */
export function scene(af: Airfoil, alphaDeg: number, halfHeight = VIEW.halfHeight) {
  const alpha = rad(alphaDeg);
  const lines: Complex[][] = [];
  for (let i = 0; i < STREAMLINES; i++) {
    // Seeds spread over the height, denser near the airfoil where the flow bends.
    const f = (i + 0.5) / STREAMLINES - 0.5;
    const y = Math.sign(f) * Math.pow(Math.abs(f) * 2, 1.35) * halfHeight;
    const z0 = fromView(alpha, { re: VIEW.left - 0.5, im: y });
    lines.push(streamline(af, alpha, z0, { dt: 0.06, steps: 500, xMax: VIEW.right + 1 }).map((z) => toView(alpha, z)));
  }
  const outline = surface(af, 160).map((z) => toView(alpha, z));
  return { lines, outline };
}
