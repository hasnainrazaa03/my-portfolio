/**
 * lbm.test.js — the lattice-Boltzmann solver behaves like a fluid.
 *
 * Small grids and few steps, so the suite stays fast, but each check is a
 * physical property: mass is conserved, a uniform stream stays uniform, a
 * body feels drag along the flow and an airfoil at incidence feels lift
 * upward, the wake behind a cylinder becomes unsteady at moderate Reynolds
 * number, and the large-eddy model adds viscosity where the shear is strong.
 */
import { describe, it, expect } from 'vitest';
import { Lattice, equilibrium, WEIGHTS, MIN_TAU } from '../lab/flow/lbm';

import { nacaSection, rasterise, inside } from '../lab/flow/airfoil';

const cylinder = (w, h, cx, cy, r) => {
  const m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) m[y * w + x] = 1;
  return m;
};

describe('equilibrium', () => {
  it('sums to the density and carries the momentum', () => {
    let r = 0;
    let jx = 0;
    for (let i = 0; i < 9; i++) r += equilibrium(i, 1.1, 0.05, 0.02);
    expect(r).toBeCloseTo(1.1, 6);
    for (let i = 0; i < 9; i++) jx += [0, 1, 0, -1, 0, 1, -1, -1, 1][i] * equilibrium(i, 1, 0.05, 0);
    expect(jx).toBeCloseTo(0.05, 6);
    expect(WEIGHTS.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });
});

describe('the lattice', () => {
  it('keeps a uniform stream uniform and conserves mass', () => {
    const l = new Lattice(60, 24);
    l.setParams({ u0: 0.08, nu: 0.02 });
    l.reset();
    const m0 = l.mass();
    l.step(50);
    expect(l.diverged).toBe(false);
    expect(l.mass()).toBeCloseTo(m0, 1);
    // Downstream of the starting nudge the stream is the inlet stream.
    const c = 12 * 60 + 50;
    expect(l.ux[c]).toBeCloseTo(0.08, 3);
    expect(Math.abs(l.uy[c])).toBeLessThan(2e-3);
  });

  it('never lets the relaxation time fall below the stability floor', () => {
    const l = new Lattice(10, 10);
    l.setParams({ nu: 0 });
    expect(l.tau).toBe(MIN_TAU);
    l.setParams({ u0: 5 });
    expect(l.params.u0).toBeLessThanOrEqual(0.12);
  });

  it('feels drag along the stream from a cylinder, and no net lift', () => {
    const l = new Lattice(120, 60);
    l.setParams({ u0: 0.08, nu: 0.03 });
    l.setSolid(cylinder(120, 60, 35, 30, 6));
    l.reset();
    l.step(400);
    expect(l.diverged).toBe(false);
    expect(l.forceX).toBeGreaterThan(0);
    expect(Math.abs(l.forceY)).toBeLessThan(0.3 * l.forceX);
    const { cd } = l.coefficients(12);
    expect(cd).toBeGreaterThan(0.5);
    expect(cd).toBeLessThan(6);
  }, 30_000);

  it('sheds an unsteady wake behind a cylinder at moderate Reynolds number', () => {
    // Re = 0.1 · 12 / 0.0075 = 160: well past the onset of vortex shedding.
    const l = new Lattice(160, 64);
    l.setParams({ u0: 0.1, nu: 0.0075 });
    l.setSolid(cylinder(160, 64, 40, 33, 6));
    l.reset();
    l.step(2000);
    expect(l.diverged).toBe(false);
    // The transverse velocity behind the body swings both ways, by a good
    // fraction of the stream speed, and keeps doing so.
    const probe = 32 * 160 + 85;
    const samples = [];
    for (let k = 0; k < 30; k++) {
      l.step(25);
      samples.push(l.uy[probe]);
    }
    const max = Math.max(...samples);
    const min = Math.min(...samples);
    expect(max - min).toBeGreaterThan(0.03);
    expect(max).toBeGreaterThan(0);
    expect(min).toBeLessThan(0);
    // And the drag is what a 2D cylinder at this Reynolds number produces.
    const { cd } = l.coefficients(12);
    expect(cd).toBeGreaterThan(0.9);
    expect(cd).toBeLessThan(2.5);
  }, 60_000);

  it('gives an airfoil at incidence upward lift', () => {
    const w = 120;
    const h = 60;
    const l = new Lattice(w, h);
    l.setParams({ u0: 0.08, nu: 0.02 });
    const clAt = (alphaDeg) => {
      l.setSolid(rasterise({ designation: '4412', chord: 30, alphaDeg, x0: 30, y0: 30 }, w, h));
      l.reset();
      l.step(2200); // past the starting vortex
      expect(l.diverged).toBe(false);
      expect(l.forceX).toBeGreaterThan(0);
      return l.coefficients(30).cl;
    };
    const flat = clAt(0);
    const pitched = clAt(8);
    expect(flat).toBeGreaterThan(0); // camber alone lifts
    expect(pitched).toBeGreaterThan(flat);
  }, 60_000);

  it('raises the effective viscosity where the shear is strong when the large-eddy model is on', () => {
    const run = (les) => {
      const l = new Lattice(120, 48);
      l.setParams({ u0: 0.12, nu: 0.0025, les });
      l.setSolid(cylinder(120, 48, 30, 25, 6));
      l.reset();
      l.step(600);
      return l;
    };
    const bgk = run(false);
    const les = run(true);
    expect(bgk.diverged).toBe(false);
    expect(les.diverged).toBe(false);
    expect(bgk.maxTau).toBe(bgk.tau);
    expect(les.maxTau).toBeGreaterThan(les.tau * 1.02);
  }, 60_000);
});

describe('changing the body mid-run', () => {
  it('survives a sharp change of angle: freed cells restart as fluid at rest', () => {
    const w = 120;
    const h = 60;
    const l = new Lattice(w, h);
    l.setParams({ u0: 0.1, nu: 0.006 });
    l.setSolid(rasterise({ designation: '4412', chord: 30, alphaDeg: 0, x0: 30, y0: 30 }, w, h));
    l.reset();
    l.step(400);
    l.setSolid(rasterise({ designation: '4412', chord: 30, alphaDeg: 16, x0: 30, y0: 30 }, w, h));
    l.step(400);
    expect(l.diverged).toBe(false);
    l.setSolid(rasterise({ designation: '4412', chord: 30, alphaDeg: -6, x0: 30, y0: 30 }, w, h));
    l.step(400);
    expect(l.diverged).toBe(false);
    for (let c = 0; c < l.n; c++) if (!l.solid[c]) expect(l.rho[c]).toBeGreaterThan(0.5);
  }, 30_000);
});

describe('the airfoil mask', () => {
  it('has the 4412 shape: 12% thick, cambered up, sharp trailing edge', () => {
    const { upper, lower } = nacaSection('4412');
    const thickness = Math.max(...upper.map(([, y], i) => y - lower[i][1]));
    expect(thickness).toBeCloseTo(0.12, 1);
    const camber = upper.map(([, y], i) => (y + lower[i][1]) / 2);
    expect(Math.max(...camber)).toBeGreaterThan(0.03);
    expect(Math.abs(upper[upper.length - 1][1] - lower[lower.length - 1][1])).toBeLessThan(0.01);
  });

  it('rasterises to a solid region that pitches nose-up with the angle', () => {
    const flat = rasterise({ designation: '4412', chord: 50, alphaDeg: 0, x0: 20, y0: 40 }, 120, 80);
    const pitched = rasterise({ designation: '4412', chord: 50, alphaDeg: 15, x0: 20, y0: 40 }, 120, 80);
    const count = (m) => m.reduce((a, b) => a + b, 0);
    expect(count(flat)).toBeGreaterThan(150);
    expect(Math.abs(count(pitched) - count(flat)) / count(flat)).toBeLessThan(0.25);
    // Trailing edge lower than the leading edge when pitched nose-up.
    const rowOf = (m, x) => {
      let s = 0;
      let n = 0;
      for (let y = 0; y < 80; y++) if (m[y * 120 + x]) (s += y), n++;
      return n ? s / n : NaN;
    };
    expect(rowOf(pitched, 64)).toBeLessThan(rowOf(pitched, 24));
    expect(inside([[0, 0], [10, 0], [10, 10], [0, 10]], 5, 5)).toBe(true);
    expect(inside([[0, 0], [10, 0], [10, 10], [0, 10]], 15, 5)).toBe(false);
  });
});
