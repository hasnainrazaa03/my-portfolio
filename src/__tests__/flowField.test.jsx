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
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ThemeProvider } from '../context/ThemeProvider';
import FlowField from '../components/FlowField';
import FlowFieldStatic from '../components/FlowFieldStatic';

const stubContext = () =>
  new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => undefined) });

let getContext;
let raf;

beforeEach(() => {
  getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => stubContext());
  raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
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

describe('FlowFieldStatic', () => {
  it('is real streamlines and an airfoil, not a placeholder', () => {
    const { container } = renderWith(<FlowFieldStatic alphaDeg={6} />);
    expect(container.querySelectorAll('polyline').length).toBeGreaterThan(10);
    const polygon = container.querySelector('polygon');
    expect(polygon.getAttribute('points').split(' ').length).toBeGreaterThan(100);
    expect(screen.getByText(/α 6\.0°/)).toBeInTheDocument();
  });
});
