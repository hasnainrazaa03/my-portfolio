/**
 * airfoil.ts — a NACA 4-digit section rasterised onto the lattice.
 *
 * The 4412 is the section from the CFD study on this site, so the solver
 * page shows the same shape. The mask is rebuilt whenever the angle changes;
 * rotation is about the quarter-chord point, where the aerodynamic centre
 * of a thin airfoil sits.
 */

export interface AirfoilSpec {
  /** NACA 4-digit designation, e.g. "4412". */
  designation: string;
  /** Chord in cells. */
  chord: number;
  /** Angle of attack in degrees, nose-up positive. */
  alphaDeg: number;
  /** Leading edge position of the unrotated section, in cells. */
  x0: number;
  y0: number;
}

/** Upper and lower surface points of the section, x from 0 to 1, y positive up. */
export function nacaSection(designation: string, points = 80): { upper: [number, number][]; lower: [number, number][] } {
  if (!/^\d{4}$/.test(designation)) throw new Error(`not a NACA 4-digit designation: ${designation}`);
  const m = Number(designation[0]) / 100;
  const p = Number(designation[1]) / 10;
  const t = Number(designation.slice(2)) / 100;
  const upper: [number, number][] = [];
  const lower: [number, number][] = [];
  for (let k = 0; k <= points; k++) {
    // Cosine spacing packs points at the leading edge, where curvature is highest.
    const x = 0.5 * (1 - Math.cos((Math.PI * k) / points));
    const yt = 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
    let yc = 0;
    let dyc = 0;
    if (m > 0 && p > 0) {
      if (x < p) {
        yc = (m / (p * p)) * (2 * p * x - x * x);
        dyc = ((2 * m) / (p * p)) * (p - x);
      } else {
        yc = (m / ((1 - p) * (1 - p))) * (1 - 2 * p + 2 * p * x - x * x);
        dyc = ((2 * m) / ((1 - p) * (1 - p))) * (p - x);
      }
    }
    const th = Math.atan(dyc);
    upper.push([x - yt * Math.sin(th), yc + yt * Math.cos(th)]);
    lower.push([x + yt * Math.sin(th), yc - yt * Math.cos(th)]);
  }
  return { upper, lower };
}

/** The closed outline in lattice coordinates, rotated by the angle of attack. */
export function outline(spec: AirfoilSpec): [number, number][] {
  const { upper, lower } = nacaSection(spec.designation);
  const a = (-spec.alphaDeg * Math.PI) / 180; // nose-up is a clockwise turn with y up
  const cx = 0.25;
  const place = ([x, y]: [number, number]): [number, number] => {
    const dx = (x - cx) * spec.chord;
    const dy = y * spec.chord;
    return [spec.x0 + cx * spec.chord + dx * Math.cos(a) - dy * Math.sin(a), spec.y0 + dx * Math.sin(a) + dy * Math.cos(a)];
  };
  return [...upper.map(place), ...[...lower].reverse().map(place)];
}

/** A solid mask of the lattice: 1 inside the section. */
export function rasterise(spec: AirfoilSpec, width: number, height: number): Uint8Array {
  const poly = outline(spec);
  const mask = new Uint8Array(width * height);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of poly) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(height - 1, Math.ceil(maxY)); y++) {
    for (let x = Math.max(0, Math.floor(minX)); x <= Math.min(width - 1, Math.ceil(maxX)); x++) {
      if (inside(poly, x + 0.5, y + 0.5)) mask[y * width + x] = 1;
    }
  }
  return mask;
}

/** Even-odd point-in-polygon. */
export function inside(poly: [number, number][], px: number, py: number): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
