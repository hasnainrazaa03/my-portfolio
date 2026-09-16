import { Lattice, type LatticeParams } from './lbm';
import { rasterise } from './airfoil';

/**
 * The solver's thread. The page sends settings and asks for frames; this
 * worker advances the lattice for as long as the frame budget allows,
 * paints the field into an RGBA buffer and hands it back (transferred, not
 * copied — the page returns the buffer with its next request).
 */

export type View = 'vorticity' | 'speed';
export type Theme = 'dark' | 'light';

export interface InitMessage {
  type: 'init';
  width: number;
  height: number;
  chord: number;
  x0: number;
  y0: number;
  alphaDeg: number;
  params: Partial<LatticeParams>;
  view: View;
  theme: Theme;
}
export type InMessage =
  | InitMessage
  | { type: 'params'; params: Partial<LatticeParams> }
  | { type: 'angle'; alphaDeg: number }
  | { type: 'view'; view: View }
  | { type: 'theme'; theme: Theme }
  | { type: 'reset' }
  | { type: 'frame'; budgetMs: number; buffer: ArrayBuffer | null };

export interface FrameMessage {
  type: 'frame';
  buffer: ArrayBuffer;
  width: number;
  height: number;
  steps: number;
  stepsThisFrame: number;
  msThisFrame: number;
  cl: number;
  cd: number;
  reynolds: number;
  diverged: boolean;
}

const PALETTE: Record<Theme, { bg: number[]; neg: number[]; pos: number[]; body: number[]; hi: number[] }> = {
  dark: { bg: [15, 13, 31], neg: [45, 212, 191], pos: [144, 133, 233], body: [226, 232, 240], hi: [255, 255, 255] },
  light: { bg: [248, 250, 252], neg: [13, 148, 136], pos: [74, 58, 167], body: [15, 23, 42], hi: [8, 90, 82] },
};

let lattice: Lattice | null = null;
let chord = 1;
let x0 = 0;
let y0 = 0;
let alphaDeg = 0;
let view: View = 'vorticity';
let theme: Theme = 'dark';
let vort: Float32Array | null = null;
/** Running average of the coefficients, so the readout is legible while the wake sheds. */
let clAvg = 0;
let cdAvg = 0;

function rebuildBody() {
  if (!lattice) return;
  lattice.setSolid(rasterise({ designation: '4412', chord, alphaDeg, x0, y0 }, lattice.width, lattice.height));
}

function paint(buffer: ArrayBuffer): void {
  if (!lattice) return;
  const { width, height, ux, uy, solid } = lattice;
  const px = new Uint8ClampedArray(buffer);
  const p = PALETTE[theme];
  const u0 = lattice.params.u0;
  if (!vort || vort.length !== lattice.n) vort = new Float32Array(lattice.n);
  if (view === 'vorticity') lattice.vorticity(vort);
  const vScale = 0.35 * u0;
  // Free stream sits around 45% of the ramp so the wake reads darker and the
  // fast flow over the upper surface reads brighter.
  const sScale = 2.2 * u0;
  for (let y = 0; y < height; y++) {
    // Lattice y is up; image rows go down.
    const row = height - 1 - y;
    for (let x = 0; x < width; x++) {
      const c = y * width + x;
      const o = (row * width + x) * 4;
      let r: number, g: number, b: number;
      if (solid[c]) {
        [r, g, b] = p.body;
      } else if (view === 'vorticity') {
        const v = Math.tanh(vort[c] / vScale);
        const t = Math.abs(v);
        const col = v < 0 ? p.neg : p.pos;
        r = p.bg[0] + (col[0] - p.bg[0]) * t;
        g = p.bg[1] + (col[1] - p.bg[1]) * t;
        b = p.bg[2] + (col[2] - p.bg[2]) * t;
      } else {
        const s = Math.min(1, Math.hypot(ux[c], uy[c]) / sScale);
        const k = s < 0.6 ? s / 0.6 : 1;
        const k2 = s < 0.6 ? 0 : (s - 0.6) / 0.4;
        r = p.bg[0] + (p.neg[0] - p.bg[0]) * k + (p.hi[0] - p.neg[0]) * k2;
        g = p.bg[1] + (p.neg[1] - p.bg[1]) * k + (p.hi[1] - p.neg[1]) * k2;
        b = p.bg[2] + (p.neg[2] - p.bg[2]) * k + (p.hi[2] - p.neg[2]) * k2;
      }
      px[o] = r;
      px[o + 1] = g;
      px[o + 2] = b;
      px[o + 3] = 255;
    }
  }
}

self.onmessage = (e: MessageEvent<InMessage>) => {
  const m = e.data;
  switch (m.type) {
    case 'init': {
      lattice = new Lattice(m.width, m.height);
      chord = m.chord;
      x0 = m.x0;
      y0 = m.y0;
      alphaDeg = m.alphaDeg;
      view = m.view;
      theme = m.theme;
      lattice.setParams(m.params);
      rebuildBody();
      lattice.reset();
      clAvg = cdAvg = 0;
      return;
    }
    case 'params':
      lattice?.setParams(m.params);
      return;
    case 'angle':
      alphaDeg = m.alphaDeg;
      rebuildBody();
      return;
    case 'view':
      view = m.view;
      return;
    case 'theme':
      theme = m.theme;
      return;
    case 'reset':
      lattice?.reset();
      clAvg = cdAvg = 0;
      return;
    case 'frame': {
      if (!lattice) return;
      const start = performance.now();
      let stepsThisFrame = 0;
      // At least one step, then as many as the budget allows, capped so a
      // fast machine does not race ahead of what the eye can follow.
      do {
        if (!lattice.diverged) {
          lattice.step(1);
          stepsThisFrame += 1;
          const { cl, cd } = lattice.coefficients(chord);
          clAvg += 0.02 * (cl - clAvg);
          cdAvg += 0.02 * (cd - cdAvg);
        }
      } while (performance.now() - start < m.budgetMs && stepsThisFrame < 12 && !lattice.diverged);
      const bytes = lattice.n * 4;
      const buffer = m.buffer && m.buffer.byteLength === bytes ? m.buffer : new ArrayBuffer(bytes);
      paint(buffer);
      const out: FrameMessage = {
        type: 'frame',
        buffer,
        width: lattice.width,
        height: lattice.height,
        steps: lattice.steps,
        stepsThisFrame,
        msThisFrame: performance.now() - start,
        cl: clAvg,
        cd: cdAvg,
        reynolds: lattice.reynoldsFor(chord),
        diverged: lattice.diverged,
      };
      (self as unknown as Worker).postMessage(out, [buffer]);
      return;
    }
  }
};
