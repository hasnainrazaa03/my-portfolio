/**
 * flowField.test.jsx — the hero experiment, as a component.
 *
 * The physics is covered in potentialFlow.test.js and the model in
 * surrogate.test.js. What matters here is the story a visitor is shown:
 * a picture they can pitch (drag, arrow keys, or a slider), two answers side
 * by side, a status that goes from reading the physics to learning to
 * trained, and the same finished state when the page cannot animate —
 * reduced motion, Save-Data, or no 2D context — instead of a throw, which
 * is how the old 3D hero once blanked the whole page.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act, within } from '@testing-library/react';
import { ThemeProvider } from '../context/ThemeProvider';
import FlowField from '../components/FlowField';
import FlowFieldStatic from '../components/FlowFieldStatic';

const stubContext = () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => undefined) });

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
  now = 0;
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
const errorOf = () => Number(/Error (-?[\d.]+)/.exec(screen.getByText(/^Error /).textContent)[1]);

describe('FlowField', () => {
  it('says what it is, in words a visitor can act on', () => {
    renderWith(<FlowField />);
    expect(screen.getByText(/Why a neural network for something this simple/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Teach a neural network to predict lift' })).toBeInTheDocument();
    expect(screen.getByText(/Drag the airfoil to change its angle/)).toBeInTheDocument();
    expect(screen.getByText(/ideal-flow model/)).toBeInTheDocument();
    expect(screen.getByText(/Physics/)).toBeInTheDocument();
    expect(screen.getByText(/AI prediction/)).toBeInTheDocument();
  });

  it('is a slider for the angle of attack that the arrow keys pitch', () => {
    renderWith(<FlowField />);
    const slider = screen.getByRole('slider', { name: /angle of attack/i });
    expect(slider).toHaveAttribute('aria-valuenow', '4');
    expect(screen.getByText('Angle 4.0°')).toBeInTheDocument();
    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    expect(slider).toHaveAttribute('aria-valuenow', '6');
    expect(screen.getByText('Angle 6.0°')).toBeInTheDocument();
    fireEvent.keyDown(slider, { key: 'End' });
    expect(slider).toHaveAttribute('aria-valuenow', '16');
    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    expect(slider).toHaveAttribute('aria-valuenow', '16');
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(slider).toHaveAttribute('aria-valuenow', '-6');
    expect(screen.getByText('Angle −6.0°')).toBeInTheDocument();
  });

  it('shows more lift from the physics as the angle rises', () => {
    renderWith(<FlowField />);
    const lift = () => Number(/Lift ([\d.]+)/.exec(within(screen.getByText(/Physics/).parentElement).getByText(/^Lift /).textContent)[1]);
    const before = lift();
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'End' });
    expect(lift()).toBeGreaterThan(before);
  });

  it('is honest about stall at the top of the range', () => {
    renderWith(<FlowField />);
    expect(screen.queryByText(/near stall/)).toBeNull();
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'End' });
    expect(screen.getByText(/A real wing would be near stall here/)).toBeInTheDocument();
  });

  it('tells the story in three phases, then stops training', () => {
    renderWith(<FlowField />);
    expect(screen.getByText(/Reading samples from the physics/)).toBeInTheDocument();
    frames(100); // past the 1.4 s sampling phase
    expect(screen.getByText(/Learning by gradient descent/)).toBeInTheDocument();
    frames(1500);
    expect(screen.getByText(/the surrogate now estimates lift instantly/)).toBeInTheDocument();
    expect(screen.getByText(/prediction matches physics/)).toBeInTheDocument();
    expect(errorOf()).toBeLessThan(0.05);
    // Converged: the training loop has let go of the frame queue.
    const steps = screen.getByText(/steps$/).textContent;
    frames(30);
    expect(screen.getByText(/steps$/).textContent).toBe(steps);
  });

  it('keeps the model close to the physics across the range once trained', () => {
    renderWith(<FlowField />);
    frames(1600);
    const slider = screen.getByRole('slider');
    for (const key of ['End', 'Home']) {
      fireEvent.keyDown(slider, { key });
      expect(errorOf()).toBeLessThan(0.08);
    }
  });

  it('retrains from scratch on request', () => {
    renderWith(<FlowField />);
    frames(1600);
    expect(screen.getByText('Model trained ✓')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retrain/i }));
    expect(screen.getByText(/Reading samples from the physics/)).toBeInTheDocument();
    expect(screen.queryByText(/prediction matches physics/)).toBeNull();
    frames(1600);
    expect(screen.getByText('Model trained ✓')).toBeInTheDocument();
  });

  it('shows the finished state with a slider when motion is off', () => {
    renderWith(<FlowField motion={false} />);
    expect(screen.getByRole('img', { name: /streamlines of ideal flow/i })).toBeInTheDocument();
    expect(screen.queryByRole('slider', { name: /angle of attack of the airfoil/i })).toBeNull();
    const input = screen.getByLabelText('Angle of attack');
    expect(input).toHaveAttribute('type', 'range');
    expect(screen.getByText('Model trained ✓')).toBeInTheDocument();
    expect(errorOf()).toBeLessThan(0.05);
    expect(raf).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '12' } });
    expect(screen.getByText('Angle 12.0°')).toBeInTheDocument();
    expect(errorOf()).toBeLessThan(0.08);
  });

  it('respects prefers-reduced-motion', () => {
    const original = window.matchMedia;
    window.matchMedia = (q) => ({ matches: /reduced-motion/.test(q), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
    try {
      renderWith(<FlowField />);
      expect(screen.getByRole('img', { name: /streamlines/i })).toBeInTheDocument();
      expect(screen.getByText('Model trained ✓')).toBeInTheDocument();
      expect(raf).not.toHaveBeenCalled();
    } finally {
      window.matchMedia = original;
    }
  });

  it('falls back to the finished still picture when a 2D context cannot be had, without throwing', () => {
    getContext.mockImplementation(() => null);
    expect(() => renderWith(<FlowField />)).not.toThrow();
    expect(screen.getByRole('img', { name: /streamlines/i })).toBeInTheDocument();
    expect(screen.getByText('Model trained ✓')).toBeInTheDocument();
  });

  it('is simpler on a phone: slider, two answers, no diagram or chart', () => {
    renderWith(<FlowField compact />);
    expect(screen.getByLabelText('Angle of attack')).toHaveAttribute('type', 'range');
    expect(screen.getByText(/Slide to change/)).toBeInTheDocument();
    expect(screen.queryByText('Neural network')).toBeNull();
    expect(screen.queryByText('Lift against angle')).toBeNull();
    expect(screen.getByText(/AI prediction/)).toBeInTheDocument();
    frames(1600);
    expect(screen.getByText(/the surrogate now estimates lift instantly/)).toBeInTheDocument();
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
