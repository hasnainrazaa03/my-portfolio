/**
 * flowField.test.jsx — the hero's flow picture, as a component.
 *
 * The physics is covered in potentialFlow.test.js. What matters here: it is a
 * keyboard-operable slider with a truthful readout, it says on screen that it
 * is an ideal-flow model, and it degrades to the still SVG when it cannot
 * animate — reduced motion, Save-Data, or no 2D context — instead of
 * throwing out of an effect, which is how the old 3D hero once blanked the
 * whole page.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { ThemeProvider } from '../context/ThemeProvider';
import FlowField from '../components/FlowField';
import FlowFieldStatic from '../components/FlowFieldStatic';

const stubContext = () =>
  new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => undefined) });

let getContext;
let raf;
let queue = [];
let now = 0;

/** Run the next `n` animation frames, 16 ms apart. */
const frames = (n) => {
  for (let i = 0; i < n; i++) {
    const pending = queue;
    queue = [];
    now += 16;
    act(() => pending.forEach((cb) => cb(now)));
  }
};

beforeEach(() => {
  queue = [];
  getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => stubContext());
  raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    queue.push(cb);
    return queue.length;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const renderWith = (ui) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('FlowField', () => {
  it('is a slider for the angle of attack with a lift readout', () => {
    renderWith(<FlowField />);
    const slider = screen.getByRole('slider', { name: /angle of attack/i });
    expect(slider).toHaveAttribute('aria-valuenow', '4');
    expect(slider).toHaveAttribute('aria-valuetext', expect.stringMatching(/4 degrees, lift coefficient 0\.\d\d/));
    expect(screen.getByText(/Ideal flow/)).toBeInTheDocument();
    expect(raf).toHaveBeenCalled();
  });

  it('pitches with the arrow keys, within its range', () => {
    renderWith(<FlowField />);
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    expect(slider).toHaveAttribute('aria-valuenow', '6');
    fireEvent.keyDown(slider, { key: 'End' });
    expect(slider).toHaveAttribute('aria-valuenow', '16');
    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    expect(slider).toHaveAttribute('aria-valuenow', '16');
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(slider).toHaveAttribute('aria-valuenow', '-6');
  });

  it('shows more lift as the angle rises', () => {
    renderWith(<FlowField />);
    const slider = screen.getByRole('slider');
    const cl = () => Number(/lift coefficient (-?[\d.]+)/.exec(slider.getAttribute('aria-valuetext'))[1]);
    const before = cl();
    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    expect(cl()).toBeGreaterThan(before);
  });

  it('draws the still picture instead when motion is off', () => {
    renderWith(<FlowField motion={false} />);
    expect(screen.queryByRole('slider')).toBeNull();
    expect(screen.getByRole('img', { name: /streamlines of ideal flow/i })).toBeInTheDocument();
    expect(raf).not.toHaveBeenCalled();
  });

  it('respects prefers-reduced-motion', () => {
    const original = window.matchMedia;
    window.matchMedia = (q) => ({ matches: /reduced-motion/.test(q), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
    try {
      renderWith(<FlowField />);
      expect(screen.getByRole('img', { name: /streamlines/i })).toBeInTheDocument();
      expect(raf).not.toHaveBeenCalled();
    } finally {
      window.matchMedia = original;
    }
  });

  it('falls back to the still picture when a 2D context cannot be had, without throwing', () => {
    getContext.mockImplementation(() => null);
    expect(() => renderWith(<FlowField />)).not.toThrow();
    expect(screen.getByRole('img', { name: /streamlines/i })).toBeInTheDocument();
  });
});

describe('the surrogate in the hero', () => {
  const stepOf = () => Number(/step ([\d,]+)/.exec(screen.getByText(/step/).textContent)[1].replace(/,/g, ''));
  const predOf = () => Number(/ĉl (-?[\d.]+)/.exec(screen.getByText(/ĉl/).textContent)[1]);
  const truthOf = () => Number(/truth (-?[\d.]+)/.exec(screen.getByText(/truth/).textContent)[1]);

  it('starts untrained and says what it is', () => {
    renderWith(<FlowField />);
    expect(screen.getByText('Surrogate model')).toBeInTheDocument();
    expect(screen.getByText(/in your browser/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /neural network/i })).toBeInTheDocument();
    expect(stepOf()).toBe(0);
    expect(screen.getByText(/loss/)).toBeInTheDocument();
  });

  it('learns frame by frame until its prediction matches the physics, then stops', () => {
    renderWith(<FlowField />);
    const before = Math.abs(predOf() - truthOf());
    frames(1500);
    expect(stepOf()).toBeGreaterThan(100);
    expect(screen.getByText(/converged/)).toBeInTheDocument();
    expect(Math.abs(predOf() - truthOf())).toBeLessThan(0.05);
    expect(Math.abs(predOf() - truthOf())).toBeLessThan(before);
    // Converged: the training loop has let go of the frame queue.
    const steps = stepOf();
    frames(20);
    expect(stepOf()).toBe(steps);
  });

  it('follows the angle once trained', () => {
    renderWith(<FlowField />);
    frames(1500);
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'End' });
    expect(Math.abs(predOf() - truthOf())).toBeLessThan(0.08);
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(Math.abs(predOf() - truthOf())).toBeLessThan(0.08);
  });

  it('retrains from scratch on request', () => {
    renderWith(<FlowField />);
    frames(1500);
    expect(screen.getByText(/converged/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retrain/i }));
    expect(stepOf()).toBe(0);
    expect(screen.queryByText(/converged/)).toBeNull();
    frames(40);
    expect(stepOf()).toBeGreaterThan(0);
  });

  it('is absent from the still picture', () => {
    renderWith(<FlowField motion={false} />);
    expect(screen.queryByText('Surrogate model')).toBeNull();
  });
});

describe('FlowFieldStatic', () => {
  it('is real streamlines and an airfoil, not a placeholder', () => {
    const { container } = renderWith(<FlowFieldStatic alphaDeg={6} />);
    expect(container.querySelectorAll('polyline').length).toBeGreaterThan(10);
    const polygon = container.querySelector('polygon');
    expect(polygon.getAttribute('points').split(' ').length).toBeGreaterThan(100);
    expect(screen.getByText(/α 6\.0°/)).toBeInTheDocument();
  });
});
