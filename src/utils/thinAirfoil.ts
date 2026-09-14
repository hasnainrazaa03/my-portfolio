/**
 * Thin-airfoil theory for NACA 4-digit sections — the textbook model behind the
 * interactive lift curve on the NACA 4412 case study.
 *
 * WHAT THIS IS NOT: results from that study. The study's numbers came from
 * ANSYS Fluent with a turbulence model and a second airfoil's wake; this is the
 * inviscid, two-dimensional, small-angle idealisation every aerodynamics course
 * starts from. It predicts where the curve sits and how steep it is. It knows
 * nothing about thickness, viscosity, Reynolds number or stall, and the chart
 * says so.
 *
 * Nothing here is a looked-up constant. The zero-lift angle is integrated from
 * the section's own camber line, so the tests can check it against a worked
 * textbook example instead of against itself.
 */

export interface FourDigit {
  /** Maximum camber as a fraction of chord (the first digit / 100). */
  m: number;
  /** Chordwise position of maximum camber (the second digit / 10). */
  p: number;
}

/** Parse "4412" → { m: 0.04, p: 0.4 }. Thickness does not enter the theory. */
export function parseFourDigit(designation: string): FourDigit {
  if (!/^\d{4}$/.test(designation)) throw new Error(`not a NACA 4-digit designation: ${designation}`);
  return { m: Number(designation[0]) / 100, p: Number(designation[1]) / 10 };
}

/** Slope of the mean camber line at chord fraction x. */
export function camberSlope({ m, p }: FourDigit, x: number): number {
  if (m === 0 || p === 0) return 0;
  return x < p ? ((2 * m) / (p * p)) * (p - x) : ((2 * m) / ((1 - p) * (1 - p))) * (p - x);
}

/** Composite Simpson's rule over [0, π]. n must be even. */
function integrateTheta(f: (theta: number) => number, n = 2000): number {
  const h = Math.PI / n;
  let sum = f(0) + f(Math.PI);
  for (let i = 1; i < n; i++) sum += (i % 2 ? 4 : 2) * f(i * h);
  return (sum * h) / 3;
}

const chordAt = (theta: number) => (1 - Math.cos(theta)) / 2;

/**
 * Zero-lift angle of attack, in degrees:
 *   α_L0 = −(1/π) ∫₀^π (dz/dx)(cos θ − 1) dθ,  x = (1 − cos θ)/2
 */
export function zeroLiftAngleDeg(section: FourDigit): number {
  const integral = integrateTheta((t) => camberSlope(section, chordAt(t)) * (Math.cos(t) - 1));
  // `+ 0` turns the symmetric section's −0 into 0, which would otherwise
  // print as "−0.0°".
  return ((-integral / Math.PI) * 180) / Math.PI + 0;
}

/** Lift-curve slope of thin-airfoil theory: 2π per radian, as per degree. */
export const LIFT_SLOPE_PER_DEG = (2 * Math.PI * Math.PI) / 180;

/** Section lift coefficient at angle of attack α (degrees): cl = 2π(α − α_L0). */
export function liftCoefficient(alphaDeg: number, zeroLiftDeg: number): number {
  return LIFT_SLOPE_PER_DEG * (alphaDeg - zeroLiftDeg);
}
