/**
 * surrogate.test.js — the tiny network in the hero really learns.
 *
 * The visitor watches its error fall; these make sure it falls, that it
 * lands close to the physics everywhere in the range, and that it does so
 * deterministically, so a "it usually converges" is not what ships.
 */
import { describe, it, expect } from 'vitest';
import { createNet, forward, trainStep, trainingSet, normaliseAlpha, rng } from '../utils/surrogate';
import { joukowski, liftCoefficient } from '../utils/potentialFlow';

const af = joukowski();
const truth = (deg) => liftCoefficient(af, (deg * Math.PI) / 180);

describe('the surrogate', () => {
  it('has a deterministic start', () => {
    expect(createNet(7)).toEqual(createNet(7));
    expect(createNet(7).w1).not.toEqual(createNet(8).w1);
    const r = rng(3);
    const a = r();
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1);
  });

  it('maps the hero angle range onto [−1, 1]', () => {
    expect(normaliseAlpha(-6)).toBeCloseTo(-1, 10);
    expect(normaliseAlpha(16)).toBeCloseTo(1, 10);
    expect(normaliseAlpha(5)).toBeCloseTo(0, 10);
  });

  it('learns the lift curve from the physics within a few hundred steps', () => {
    const net = createNet(1);
    const set = trainingSet(truth);
    const first = trainStep(net, set);
    let loss = first;
    for (let i = 0; i < 900; i++) loss = trainStep(net, set);
    expect(loss).toBeLessThan(first / 100);
    expect(loss).toBeLessThan(2e-4);

    // Close to the truth everywhere, not only at the training points.
    for (let deg = -6; deg <= 16; deg += 0.7) {
      const pred = forward(net, normaliseAlpha(deg)).y;
      expect(Math.abs(pred - truth(deg)), `α = ${deg}`).toBeLessThan(0.05);
    }
  });

  it('converges from every seed the hero might use', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const net = createNet(seed);
      const set = trainingSet(truth);
      let loss = Infinity;
      for (let i = 0; i < 1200; i++) loss = trainStep(net, set);
      expect(loss, `seed ${seed}`).toBeLessThan(5e-4);
    }
  });

  it('exposes hidden activations bounded by tanh', () => {
    const { h } = forward(createNet(2), 0.3);
    expect(h).toHaveLength(6);
    for (const a of h) expect(Math.abs(a)).toBeLessThanOrEqual(1);
  });
});
