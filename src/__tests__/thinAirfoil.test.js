/**
 * thinAirfoil.test.js — the physics under the NACA 4412 lift curve.
 *
 * Checked against the theory's own closed forms and a worked textbook example
 * rather than against numbers this module produced, so a sign error or a
 * degrees/radians slip cannot pass by agreeing with itself.
 */
import { describe, it, expect } from 'vitest';
import {
  parseFourDigit,
  camberSlope,
  zeroLiftAngleDeg,
  liftCoefficient,
  LIFT_SLOPE_PER_DEG,
} from '../utils/thinAirfoil';

describe('parsing a designation', () => {
  it('reads camber and its position, ignoring thickness', () => {
    expect(parseFourDigit('4412')).toEqual({ m: 0.04, p: 0.4 });
    expect(parseFourDigit('0012')).toEqual({ m: 0, p: 0 });
  });

  it('refuses anything that is not four digits', () => {
    expect(() => parseFourDigit('23012')).toThrow();
    expect(() => parseFourDigit('44a2')).toThrow();
  });
});

describe('the camber line', () => {
  const s = parseFourDigit('4412');

  it('is flat at the point of maximum camber, from both sides', () => {
    expect(camberSlope(s, 0.4)).toBeCloseTo(0, 12);
    expect(camberSlope(s, 0.4 - 1e-9)).toBeCloseTo(0, 6);
  });

  it('rises ahead of maximum camber and falls behind it', () => {
    expect(camberSlope(s, 0.1)).toBeGreaterThan(0);
    expect(camberSlope(s, 0.8)).toBeLessThan(0);
  });

  it('matches the analytic leading-edge slope 2m/p', () => {
    expect(camberSlope(s, 0)).toBeCloseTo((2 * 0.04) / 0.4, 12);
  });
});

describe('zero-lift angle', () => {
  it('is zero for a symmetric section', () => {
    expect(zeroLiftAngleDeg(parseFourDigit('0012'))).toBe(0);
  });

  it('reproduces the worked NACA 2412 example: about −2.08°', () => {
    // Anderson, Fundamentals of Aerodynamics, thin-airfoil worked example.
    expect(zeroLiftAngleDeg(parseFourDigit('2412'))).toBeCloseTo(-2.08, 2);
  });

  it('is linear in camber, so the 4412 sits at twice the 2412', () => {
    const a2 = zeroLiftAngleDeg(parseFourDigit('2412'));
    const a4 = zeroLiftAngleDeg(parseFourDigit('4412'));
    expect(a4).toBeCloseTo(2 * a2, 8);
    expect(a4).toBeCloseTo(-4.15, 2);
  });
});

describe('the lift curve', () => {
  it('has the theory slope of 2π per radian', () => {
    expect(LIFT_SLOPE_PER_DEG * (180 / Math.PI)).toBeCloseTo(2 * Math.PI, 12);
    expect(LIFT_SLOPE_PER_DEG).toBeCloseTo(0.1097, 4);
  });

  it('crosses zero exactly at the zero-lift angle', () => {
    expect(liftCoefficient(-4.15, -4.15)).toBe(0);
  });

  it('gives a symmetric section no lift at zero incidence', () => {
    expect(liftCoefficient(0, 0)).toBe(0);
  });
});
