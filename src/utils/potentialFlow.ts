/**
 * potentialFlow.ts — ideal flow around a Joukowski airfoil, for the hero.
 *
 * WHAT THIS IS: the classical two-dimensional, inviscid, incompressible model
 * every aerodynamics course derives first. A cylinder with circulation sits in
 * a uniform stream in the ζ-plane; the Joukowski transform z = ζ + a²/ζ turns
 * the cylinder into an airfoil and carries the flow with it. The Kutta
 * condition fixes the circulation so the flow leaves the trailing edge
 * smoothly, and Kutta–Joukowski then gives the lift. Every velocity drawn on
 * the page is this closed form, evaluated at that point.
 *
 * WHAT IT IS NOT: a result from any CFD study on this site. No viscosity, no
 * turbulence, no stall, no wake. The hero labels it as an ideal-flow model so
 * it cannot be mistaken for measured or simulated data.
 *
 * Units: freestream speed U = 1, cylinder scale a = 1, so the airfoil chord is
 * about 4 and speeds are fractions of U. Angles are radians here; the
 * component converts from degrees at the edge.
 */

export interface Complex {
  re: number;
  im: number;
}

export interface Airfoil {
  /** Joukowski parameter: the trailing edge sits at z = 2a. */
  a: number;
  /** Circle centre. cx < 0 gives thickness, cy > 0 gives camber. */
  cx: number;
  cy: number;
  /** Circle radius: passes through ζ = a, the point that maps to the cusp. */
  R: number;
  /** Zero-lift angle is −β: the circle centre's elevation as seen from ζ = a. */
  beta: number;
  /** Straight-line chord, leading edge to trailing edge, measured from the surface. */
  chord: number;
}

const c = (re: number, im = 0): Complex => ({ re, im });
const add = (p: Complex, q: Complex): Complex => c(p.re + q.re, p.im + q.im);
const sub = (p: Complex, q: Complex): Complex => c(p.re - q.re, p.im - q.im);
const mul = (p: Complex, q: Complex): Complex => c(p.re * q.re - p.im * q.im, p.re * q.im + p.im * q.re);
const div = (p: Complex, q: Complex): Complex => {
  const d = q.re * q.re + q.im * q.im;
  return c((p.re * q.re + p.im * q.im) / d, (p.im * q.re - p.re * q.im) / d);
};
const abs2 = (p: Complex): number => p.re * p.re + p.im * p.im;
const conj = (p: Complex): Complex => c(p.re, -p.im);
const expi = (t: number): Complex => c(Math.cos(t), Math.sin(t));
const csqrt = (p: Complex): Complex => {
  const r = Math.hypot(p.re, p.im);
  const re = Math.sqrt(Math.max(0, (r + p.re) / 2));
  const im = Math.sign(p.im || 1) * Math.sqrt(Math.max(0, (r - p.re) / 2));
  return c(re, im);
};

/** z = ζ + a²/ζ. */
export function toZ(af: Airfoil, zeta: Complex): Complex {
  return add(zeta, div(c(af.a * af.a), zeta));
}

/**
 * The inverse map. z has two preimages, ζ and a²/ζ; the one outside the circle
 * is the flow domain, so take the root farther from the circle's centre.
 */
export function toZeta(af: Airfoil, z: Complex): Complex {
  const root = csqrt(sub(mul(z, z), c(4 * af.a * af.a)));
  const p = c((z.re + root.re) / 2, (z.im + root.im) / 2);
  const q = c((z.re - root.re) / 2, (z.im - root.im) / 2);
  const centre = c(af.cx, af.cy);
  return abs2(sub(p, centre)) >= abs2(sub(q, centre)) ? p : q;
}

/** Points on the airfoil surface, leading edge round to trailing edge and back. */
export function surface(af: Airfoil, n = 120): Complex[] {
  const pts: Complex[] = [];
  const start = -af.beta; // ζ = a, the trailing edge
  for (let i = 0; i < n; i++) {
    const t = start + (i / n) * 2 * Math.PI;
    pts.push(toZ(af, c(af.cx + af.R * Math.cos(t), af.cy + af.R * Math.sin(t))));
  }
  return pts;
}

/**
 * A Joukowski section. The defaults give a section about 15% thick with
 * gentle camber, chosen to read as an airfoil at hero size rather than to
 * match any particular NACA number.
 */
export function joukowski({ eps = 0.11, kappa = 0.07 }: { eps?: number; kappa?: number } = {}): Airfoil {
  const a = 1;
  const cx = -eps;
  const cy = kappa;
  const R = Math.hypot(a - cx, cy);
  const beta = Math.asin(cy / R);
  const partial: Airfoil = { a, cx, cy, R, beta, chord: 4 * a };
  const xs = surface(partial).map((p) => p.re);
  return { ...partial, chord: Math.max(...xs) - Math.min(...xs) };
}

/**
 * Circulation that satisfies the Kutta condition at angle of attack α:
 * the velocity in the ζ-plane vanishes at ζ = a, so the flow leaves the cusp
 * finite and tangent instead of whipping round it. Γ = 4πUR sin(α + β).
 */
export function circulation(af: Airfoil, alpha: number): number {
  return 4 * Math.PI * af.R * Math.sin(alpha + af.beta);
}

/** Kutta–Joukowski: L = ρUΓ, so cl = 2Γ / (U · chord). */
export function liftCoefficient(af: Airfoil, alpha: number): number {
  return (2 * circulation(af, alpha)) / af.chord;
}

/**
 * dW/dζ — the conjugate velocity of the cylinder flow in the ζ-plane:
 * uniform stream at angle α, doublet for the cylinder, vortex for the lift.
 */
export function zetaVelocity(af: Airfoil, alpha: number, zeta: Complex): Complex {
  const d = sub(zeta, c(af.cx, af.cy));
  const stream = expi(-alpha);
  const doublet = div(mul(c(af.R * af.R), expi(alpha)), mul(d, d));
  const g = circulation(af, alpha);
  const vortex = div(c(0, g / (2 * Math.PI)), d);
  return add(sub(stream, doublet), vortex);
}

/** dz/dζ = 1 − a²/ζ². Zero at ζ = ±a, which is why the Kutta condition is needed. */
function dzdzeta(af: Airfoil, zeta: Complex): Complex {
  return sub(c(1), div(c(af.a * af.a), mul(zeta, zeta)));
}

/**
 * Physical velocity (u, v) in the z-plane at ζ. dW/dz = (dW/dζ)/(dz/dζ) is the
 * conjugate velocity, so v carries a sign flip.
 */
export function velocityAtZeta(af: Airfoil, alpha: number, zeta: Complex): { u: number; v: number } {
  const w = div(zetaVelocity(af, alpha, zeta), dzdzeta(af, zeta));
  return { u: w.re, v: -w.im };
}

/** Physical velocity at a point z of the airfoil plane. */
export function velocityAt(af: Airfoil, alpha: number, z: Complex): { u: number; v: number } {
  return velocityAtZeta(af, alpha, toZeta(af, z));
}

/**
 * One time step for a fluid particle, integrated in the ζ-plane: the circle is
 * a hard boundary there, so a particle can never cross into the airfoil, and
 * there is no inverse map to take each frame. dζ/dt = conj(dW/dζ) / |dz/dζ|².
 * Midpoint rule; dt is in units of a/U.
 */
export function advect(af: Airfoil, alpha: number, zeta: Complex, dt: number): Complex {
  const rate = (p: Complex): Complex => {
    const j = dzdzeta(af, p);
    const w = conj(zetaVelocity(af, alpha, p));
    const s = abs2(j);
    return c(w.re / s, w.im / s);
  };
  const k1 = rate(zeta);
  const mid = c(zeta.re + (dt / 2) * k1.re, zeta.im + (dt / 2) * k1.im);
  const k2 = rate(mid);
  return c(zeta.re + dt * k2.re, zeta.im + dt * k2.im);
}

/**
 * A streamline starting at z0 in the airfoil plane, as z-plane points, until
 * it leaves `xMax` or `steps` run out.
 */
export function streamline(af: Airfoil, alpha: number, z0: Complex, { dt = 0.05, steps = 600, xMax = 8 } = {}): Complex[] {
  let zeta = toZeta(af, z0);
  const out: Complex[] = [z0];
  for (let i = 0; i < steps; i++) {
    zeta = advect(af, alpha, zeta, dt);
    const z = toZ(af, zeta);
    out.push(z);
    if (z.re > xMax) break;
  }
  return out;
}

/** Rotate a z-plane point so the freestream reads left-to-right. */
export function toView(alpha: number, z: Complex): Complex {
  return mul(z, expi(-alpha));
}

/** Inverse of toView. */
export function fromView(alpha: number, v: Complex): Complex {
  return mul(v, expi(alpha));
}
