/**
 * potentialFlow.test.js — the ideal-flow model behind the hero.
 *
 * Checked against the theory's own properties rather than against numbers
 * this module produced: the far field is the freestream, the surface is a
 * streamline, the trailing edge is smooth (Kutta), and lift follows the
 * thin-airfoil slope. A sign slip anywhere fails one of these.
 */
import { describe, it, expect } from 'vitest';
import {
  joukowski,
  toZ,
  toZeta,
  surface,
  circulation,
  liftCoefficient,
  velocityAt,
  velocityAtZeta,
  advect,
  streamline,
  toView,
  fromView,
} from '../utils/potentialFlow';

const af = joukowski();
const deg = (d) => (d * Math.PI) / 180;

describe('the section', () => {
  it('has its trailing edge at z = 2a and a chord a little over 4a', () => {
    const pts = surface(af);
    expect(pts[0].re).toBeCloseTo(2 * af.a, 6);
    expect(pts[0].im).toBeCloseTo(0, 6);
    expect(af.chord).toBeGreaterThan(4);
    expect(af.chord).toBeLessThan(4.5);
  });

  it('is thicker than a line and cambered upwards', () => {
    const pts = surface(af, 400);
    const ys = pts.map((p) => p.im);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(0.3);
    // Mean camber line sits above the chord line.
    expect(Math.max(...ys)).toBeGreaterThan(-Math.min(...ys));
  });

  it('maps ζ → z → ζ back to itself in the flow domain', () => {
    for (const zeta of [{ re: 2, im: 1 }, { re: -3, im: 0.2 }, { re: 0.5, im: 3 }, { re: af.cx + af.R * 1.01, im: af.cy }]) {
      const back = toZeta(af, toZ(af, zeta));
      expect(back.re).toBeCloseTo(zeta.re, 8);
      expect(back.im).toBeCloseTo(zeta.im, 8);
    }
  });
});

describe('the flow', () => {
  it('is the freestream far from the airfoil', () => {
    const alpha = deg(5);
    const { u, v } = velocityAt(af, alpha, { re: -40000, im: 30000 });
    expect(u).toBeCloseTo(Math.cos(alpha), 3);
    expect(v).toBeCloseTo(Math.sin(alpha), 3);
  });

  it('never crosses the surface: velocity is tangent all the way round', () => {
    // Just outside the circle in ζ so dz/dζ is well conditioned.
    for (let i = 1; i < 60; i++) {
      const t = -af.beta + (i / 60) * 2 * Math.PI;
      const zeta = { re: af.cx + af.R * 1.0005 * Math.cos(t), im: af.cy + af.R * 1.0005 * Math.sin(t) };
      const z0 = toZ(af, zeta);
      const z1 = toZ(af, { re: af.cx + af.R * 1.0005 * Math.cos(t + 1e-4), im: af.cy + af.R * 1.0005 * Math.sin(t + 1e-4) });
      const tangent = { x: z1.re - z0.re, y: z1.im - z0.im };
      const { u, v } = velocityAtZeta(af, deg(6), zeta);
      const speed = Math.hypot(u, v);
      const along = Math.abs(u * tangent.x + v * tangent.y) / Math.hypot(tangent.x, tangent.y);
      if (speed > 1e-6) expect(along / speed).toBeGreaterThan(0.999);
    }
  });

  it('leaves the trailing edge finite, which is what the Kutta condition buys', () => {
    // Without the vortex term dz/dζ = 0 at ζ = a would make this infinite.
    const near = { re: af.a * 1.0001, im: 1e-5 };
    const { u, v } = velocityAtZeta(af, deg(8), near);
    expect(Number.isFinite(u) && Number.isFinite(v)).toBe(true);
    expect(Math.hypot(u, v)).toBeLessThan(3);
  });

  it('goes faster over the top than under the bottom at positive incidence', () => {
    const alpha = deg(6);
    const top = velocityAt(af, alpha, { re: 0, im: 0.6 });
    const bottom = velocityAt(af, alpha, { re: 0, im: -0.6 });
    expect(Math.hypot(top.u, top.v)).toBeGreaterThan(Math.hypot(bottom.u, bottom.v));
  });
});

describe('lift', () => {
  it('is zero at the zero-lift angle −β and rises with incidence', () => {
    expect(circulation(af, -af.beta)).toBeCloseTo(0, 10);
    expect(liftCoefficient(af, deg(0))).toBeGreaterThan(0);
    expect(liftCoefficient(af, deg(8))).toBeGreaterThan(liftCoefficient(af, deg(4)));
  });

  it('has a slope close to the thin-airfoil 2π per radian', () => {
    const slope = (liftCoefficient(af, deg(6)) - liftCoefficient(af, deg(2))) / deg(4);
    expect(slope / (2 * Math.PI)).toBeGreaterThan(0.95);
    expect(slope / (2 * Math.PI)).toBeLessThan(1.25);
  });
});

describe('particles', () => {
  it('advect downstream and never enter the airfoil', () => {
    const alpha = deg(10);
    let zeta = toZeta(af, { re: -6, im: 0.05 });
    for (let i = 0; i < 4000; i++) {
      zeta = advect(af, alpha, zeta, 0.02);
      const d = Math.hypot(zeta.re - af.cx, zeta.im - af.cy);
      expect(d).toBeGreaterThanOrEqual(af.R * 0.999);
    }
    expect(toZ(af, zeta).re).toBeGreaterThan(5);
  });

  it('a streamline from upstream reaches the far side', () => {
    const line = streamline(af, deg(4), { re: -6, im: 0.3 });
    expect(line[line.length - 1].re).toBeGreaterThan(8);
    expect(line.length).toBeGreaterThan(50);
  });
});

describe('view rotation', () => {
  it('shows the freestream as horizontal and puts the nose up at positive α', () => {
    const alpha = deg(10);
    const far = { re: -100000, im: 0 };
    const { u, v } = velocityAt(af, alpha, fromView(alpha, far));
    // Rotate the velocity into the view frame.
    const vv = toView(alpha, { re: u, im: v });
    expect(vv.re).toBeCloseTo(1, 3);
    expect(vv.im).toBeCloseTo(0, 3);
    const te = toView(alpha, { re: 2, im: 0 });
    expect(te.im).toBeLessThan(0); // trailing edge below the leading edge: nose up
    const round = fromView(alpha, toView(alpha, { re: 1.3, im: -0.4 }));
    expect(round.re).toBeCloseTo(1.3, 10);
    expect(round.im).toBeCloseTo(-0.4, 10);
  });
});
