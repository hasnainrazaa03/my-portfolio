/**
 * surrogate.ts — a small neural network that learns the lift curve from the
 * physics, trained live in the visitor's browser.
 *
 * WHY: the hero's flow picture is the aerospace half of the story. This is
 * the other half. In aerospace ML a "surrogate model" is a network trained
 * to stand in for an expensive simulation; here the simulation is the ideal
 * flow next to it, and the network learns α → cl by gradient descent while
 * the visitor watches the error fall. It is deliberately tiny — one input,
 * one hidden layer of tanh units, one output — so the whole thing is a few
 * dozen numbers and a visitor can see every weight.
 *
 * Plain arrays and loops, no dependency. Deterministic given a seed so the
 * tests can assert on convergence rather than hope for it.
 */

export interface Net {
  hidden: number;
  w1: number[]; // input → hidden
  b1: number[];
  w2: number[]; // hidden → output
  b2: number;
  // Momentum buffers, same shapes.
  vw1: number[];
  vb1: number[];
  vw2: number[];
  vb2: number;
}

export interface Sample {
  /** Normalised input in about [−1, 1]. */
  x: number;
  y: number;
}

/** mulberry32: small, seedable, good enough for weight init. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createNet(seed = 1, hidden = 6): Net {
  const r = rng(seed);
  const u = (scale: number) => (r() * 2 - 1) * scale;
  return {
    hidden,
    w1: Array.from({ length: hidden }, () => u(1.5)),
    b1: Array.from({ length: hidden }, () => u(0.5)),
    w2: Array.from({ length: hidden }, () => u(0.5)),
    b2: 0,
    vw1: new Array(hidden).fill(0),
    vb1: new Array(hidden).fill(0),
    vw2: new Array(hidden).fill(0),
    vb2: 0,
  };
}

/** Forward pass, returning the hidden activations too (the diagram lights them). */
export function forward(net: Net, x: number): { h: number[]; y: number } {
  const h = new Array<number>(net.hidden);
  let y = net.b2;
  for (let j = 0; j < net.hidden; j++) {
    h[j] = Math.tanh(net.w1[j] * x + net.b1[j]);
    y += net.w2[j] * h[j];
  }
  return { h, y };
}

/**
 * One full-batch step of gradient descent with momentum on the mean squared
 * error. Mutates the net; returns the loss before the step.
 */
export function trainStep(net: Net, samples: Sample[], lr = 0.05, momentum = 0.9): number {
  const n = samples.length;
  const gw1 = new Array(net.hidden).fill(0);
  const gb1 = new Array(net.hidden).fill(0);
  const gw2 = new Array(net.hidden).fill(0);
  let gb2 = 0;
  let loss = 0;

  for (const { x, y } of samples) {
    const { h, y: pred } = forward(net, x);
    const err = pred - y;
    loss += err * err;
    const d = (2 * err) / n;
    gb2 += d;
    for (let j = 0; j < net.hidden; j++) {
      gw2[j] += d * h[j];
      const dh = d * net.w2[j] * (1 - h[j] * h[j]);
      gw1[j] += dh * x;
      gb1[j] += dh;
    }
  }

  for (let j = 0; j < net.hidden; j++) {
    net.vw1[j] = momentum * net.vw1[j] - lr * gw1[j];
    net.vb1[j] = momentum * net.vb1[j] - lr * gb1[j];
    net.vw2[j] = momentum * net.vw2[j] - lr * gw2[j];
    net.w1[j] += net.vw1[j];
    net.b1[j] += net.vb1[j];
    net.w2[j] += net.vw2[j];
  }
  net.vb2 = momentum * net.vb2 - lr * gb2;
  net.b2 += net.vb2;

  return loss / n;
}

/** Angle of attack in degrees → the network's input, about [−1, 1] over the hero's range. */
export function normaliseAlpha(deg: number, min = -6, max = 16): number {
  return ((deg - min) / (max - min)) * 2 - 1;
}

/** Evenly spaced training pairs over the angle range, targets from `truth`. */
export function trainingSet(truth: (deg: number) => number, count = 48, min = -6, max = 16): Sample[] {
  return Array.from({ length: count }, (_, i) => {
    const deg = min + (i / (count - 1)) * (max - min);
    return { x: normaliseAlpha(deg, min, max), y: truth(deg) };
  });
}
