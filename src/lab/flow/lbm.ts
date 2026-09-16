/**
 * lbm.ts — a two-dimensional lattice-Boltzmann flow solver (D2Q9, BGK),
 * with an optional Smagorinsky large-eddy model, small enough to run in a
 * browser and honest enough to show real flow features: separation behind
 * an airfoil at incidence, a recirculating wake, and vortex shedding.
 *
 * WHAT THIS IS: a numerical solver of the flow equations on a coarse grid.
 * Unlike the hero's ideal-flow model, it has viscosity, so a boundary layer
 * forms and can separate; unlike a production CFD code, it is low
 * resolution, two-dimensional, weakly compressible, and the "turbulence" it
 * shows is what a 2D large-eddy model on a few hundred cells resolves. The
 * page says so. Nothing here is a result from the NACA 4412 study.
 *
 * Lattice units: cell spacing 1, time step 1. Inlet speed u0 must stay well
 * below the lattice speed of sound (about 0.577), so it is capped at 0.12.
 * Viscosity nu = (tau − 1/2)/3; the Reynolds number is u0·chord/nu.
 *
 * Boundaries: the left column is a velocity inlet (equilibrium at u0), the
 * right column a zero-gradient outlet, top and bottom periodic. Solid cells
 * use half-way bounce-back, and the force on the body comes from momentum
 * exchange across the bounce-back links, which gives lift and drag.
 *
 * Plain typed arrays and loops: the same code runs in a Web Worker on the
 * page and directly in tests.
 */

// D2Q9: rest, then the four axis directions, then the four diagonals.
export const EX = [0, 1, 0, -1, 0, 1, -1, -1, 1] as const;
export const EY = [0, 0, 1, 0, -1, 1, 1, -1, -1] as const;
export const OPP = [0, 3, 4, 1, 2, 7, 8, 5, 6] as const;
const W0 = 4 / 9;
const W1 = 1 / 9;
const W2 = 1 / 36;
export const WEIGHTS = [W0, W1, W1, W1, W1, W2, W2, W2, W2] as const;

export const MAX_U0 = 0.12;
/** Below this BGK is unstable; the LES model raises the effective value locally. */
export const MIN_TAU = 0.505;

export interface LatticeParams {
  /** Inlet speed in lattice units. */
  u0: number;
  /** Kinematic viscosity in lattice units. */
  nu: number;
  /** Smagorinsky large-eddy model on/off, and its constant. */
  les: boolean;
  smagorinsky: number;
}

export interface Fields {
  ux: Float32Array;
  uy: Float32Array;
  rho: Float32Array;
  vorticity: Float32Array;
}

export class Lattice {
  readonly width: number;
  readonly height: number;
  readonly n: number;
  /** Populations, 9 per cell, laid out f[i * n + cell]. */
  private f: Float32Array;
  private g: Float32Array;
  readonly solid: Uint8Array;
  readonly ux: Float32Array;
  readonly uy: Float32Array;
  readonly rho: Float32Array;
  params: LatticeParams = { u0: 0.08, nu: 0.02, les: false, smagorinsky: 0.16 };
  /** Force on the solid over the last step, from momentum exchange. */
  forceX = 0;
  forceY = 0;
  steps = 0;
  diverged = false;
  /** Largest effective relaxation time in the last collision: how hard the LES model worked. */
  maxTau = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.n = width * height;
    this.f = new Float32Array(9 * this.n);
    this.g = new Float32Array(9 * this.n);
    this.solid = new Uint8Array(this.n);
    this.ux = new Float32Array(this.n);
    this.uy = new Float32Array(this.n);
    this.rho = new Float32Array(this.n);
    this.reset();
  }

  get tau(): number {
    return Math.max(MIN_TAU, 3 * this.params.nu + 0.5);
  }

  setParams(p: Partial<LatticeParams>): void {
    this.params = { ...this.params, ...p, u0: Math.min(MAX_U0, Math.max(0, p.u0 ?? this.params.u0)) };
  }

  /** Mark solid cells from a mask the size of the lattice. */
  setSolid(mask: Uint8Array): void {
    if (mask.length !== this.n) throw new Error('mask size does not match the lattice');
    this.solid.set(mask);
  }

  /**
   * Everything back to a uniform stream at the inlet speed, with a small
   * transverse nudge in the upstream half. A perfectly symmetric start can
   * sit in a symmetric, steady wake for tens of thousands of steps; a real
   * flow always has a disturbance to grow, so this supplies one.
   */
  reset(): void {
    const { u0 } = this.params;
    for (let c = 0; c < this.n; c++) {
      const upstream = c % this.width < this.width / 3;
      const uy = upstream ? 0.15 * u0 : 0;
      this.rho[c] = 1;
      this.ux[c] = u0;
      this.uy[c] = uy;
      for (let i = 0; i < 9; i++) this.f[i * this.n + c] = equilibrium(i, 1, u0, uy);
    }
    this.steps = 0;
    this.diverged = false;
    this.forceX = 0;
    this.forceY = 0;
  }

  /** Advance `count` time steps. */
  step(count = 1): void {
    for (let k = 0; k < count && !this.diverged; k++) {
      this.collide();
      this.stream();
      this.steps += 1;
    }
  }

  private collide(): void {
    const { n, f, solid } = this;
    const { u0, les, smagorinsky } = this.params;
    const tau0 = this.tau;
    const omega0 = 1 / tau0;
    const cs2 = smagorinsky * smagorinsky;
    let bad = false;
    let maxTau = tau0;

    for (let c = 0; c < n; c++) {
      if (solid[c]) continue;
      let r = 0;
      let jx = 0;
      let jy = 0;
      for (let i = 0; i < 9; i++) {
        const v = f[i * n + c];
        r += v;
        jx += EX[i] * v;
        jy += EY[i] * v;
      }
      if (!(r > 0.2 && r < 5)) bad = true;
      const ux = jx / r;
      const uy = jy / r;
      this.rho[c] = r;
      this.ux[c] = ux;
      this.uy[c] = uy;

      let omega = omega0;
      if (les) {
        // Non-equilibrium stress → local eddy viscosity (Smagorinsky).
        let pxx = 0;
        let pyy = 0;
        let pxy = 0;
        for (let i = 0; i < 9; i++) {
          const neq = f[i * n + c] - equilibrium(i, r, ux, uy);
          pxx += EX[i] * EX[i] * neq;
          pyy += EY[i] * EY[i] * neq;
          pxy += EX[i] * EY[i] * neq;
        }
        const q = Math.sqrt(2 * (pxx * pxx + pyy * pyy + 2 * pxy * pxy));
        const tau = 0.5 * (tau0 + Math.sqrt(tau0 * tau0 + (18 * cs2 * q) / r));
        if (tau > maxTau) maxTau = tau;
        omega = 1 / tau;
      }
      for (let i = 0; i < 9; i++) {
        const idx = i * n + c;
        f[idx] += omega * (equilibrium(i, r, ux, uy) - f[idx]);
      }
    }
    // Inlet: impose the free stream on the left column.
    for (let y = 0; y < this.height; y++) {
      const c = y * this.width;
      if (solid[c]) continue;
      for (let i = 0; i < 9; i++) f[i * n + c] = equilibrium(i, 1, u0, 0);
    }
    if (bad) this.diverged = true;
    this.maxTau = maxTau;
  }

  private stream(): void {
    const { n, f, g, solid, width, height } = this;
    let fx = 0;
    let fy = 0;
    for (let y = 0; y < height; y++) {
      const yUp = y === height - 1 ? 0 : y + 1;
      const yDown = y === 0 ? height - 1 : y - 1;
      for (let x = 0; x < width; x++) {
        const c = y * width + x;
        if (solid[c]) continue;
        for (let i = 0; i < 9; i++) {
          const nx = x + EX[i];
          const ny = EY[i] === 1 ? yUp : EY[i] === -1 ? yDown : y;
          const v = f[i * n + c];
          if (nx < 0 || nx >= width) continue; // handled by the boundaries below
          const t = ny * width + nx;
          if (solid[t]) {
            // Half-way bounce-back: the population comes straight back, and
            // its momentum goes into the body.
            g[OPP[i] * n + c] = v;
            fx += 2 * EX[i] * v;
            fy += 2 * EY[i] * v;
          } else {
            g[i * n + t] = v;
          }
        }
      }
    }
    // Left column keeps its imposed inlet; right column copies its neighbour (outflow).
    for (let y = 0; y < height; y++) {
      const l = y * width;
      const r = l + width - 1;
      for (let i = 0; i < 9; i++) {
        g[i * n + l] = f[i * n + l];
        g[i * n + r] = g[i * n + r - 1];
      }
    }
    this.f = g;
    this.g = f;
    this.forceX = fx;
    this.forceY = fy;
  }

  /** Lift and drag coefficients from the momentum-exchange force, per unit span. */
  coefficients(chord: number): { cl: number; cd: number } {
    const q = 0.5 * this.params.u0 * this.params.u0 * chord;
    return q > 0 ? { cl: this.forceY / q, cd: this.forceX / q } : { cl: 0, cd: 0 };
  }

  reynoldsFor(chord: number): number {
    return (this.params.u0 * chord) / this.params.nu;
  }

  /** Vorticity by central differences, zero on and beside solid cells. */
  vorticity(out?: Float32Array): Float32Array {
    const { width, height, ux, uy, solid } = this;
    const w = out ?? new Float32Array(this.n);
    for (let y = 0; y < height; y++) {
      const yUp = y === height - 1 ? 0 : y + 1;
      const yDown = y === 0 ? height - 1 : y - 1;
      for (let x = 1; x < width - 1; x++) {
        const c = y * width + x;
        if (solid[c] || solid[c - 1] || solid[c + 1] || solid[yUp * width + x] || solid[yDown * width + x]) {
          w[c] = 0;
          continue;
        }
        w[c] = 0.5 * (uy[c + 1] - uy[c - 1]) - 0.5 * (ux[yUp * width + x] - ux[yDown * width + x]);
      }
    }
    return w;
  }

  /** Total mass, for conservation checks. */
  mass(): number {
    let m = 0;
    for (let c = 0; c < this.n; c++) if (!this.solid[c]) m += this.rho[c];
    return m;
  }
}

/** The D2Q9 equilibrium distribution. */
export function equilibrium(i: number, rho: number, ux: number, uy: number): number {
  const eu = EX[i] * ux + EY[i] * uy;
  const uu = ux * ux + uy * uy;
  return WEIGHTS[i] * rho * (1 + 3 * eu + 4.5 * eu * eu - 1.5 * uu);
}
