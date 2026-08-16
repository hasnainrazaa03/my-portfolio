/**
 * starfield.test.js — Star particle behaviour.
 *
 * This logic was previously declared inline inside SpaceBackground's effect,
 * which made React Compiler bail on the component and made the motion rules
 * untestable. Hoisting it fixed both.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Star, starCountFor } from '../utils/starfield';

const makeEnv = (over = {}) => ({
  canvas: { width: 1000, height: 800 },
  ctx: { fillStyle: '', beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn() },
  isMobile: false,
  isDark: true,
  prefersReducedMotion: false,
  ...over,
});

afterEach(() => vi.restoreAllMocks());

describe('starCountFor', () => {
  it('uses a reduced count on mobile viewports', () => {
    expect(starCountFor(375)).toBe(60);
    expect(starCountFor(767)).toBe(60);
  });

  it('uses the full count at desktop widths', () => {
    expect(starCountFor(768)).toBe(150);
    expect(starCountFor(1920)).toBe(150);
  });
});

describe('Star', () => {
  it('spawns within the canvas bounds', () => {
    const env = makeEnv();
    for (let i = 0; i < 50; i++) {
      const s = new Star(env);
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThanOrEqual(env.canvas.width);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeLessThanOrEqual(env.canvas.height);
    }
  });

  it('does not move under prefers-reduced-motion', () => {
    const star = new Star(makeEnv({ prefersReducedMotion: true }));
    const { x, y, brightness } = star;
    star.update();
    star.update();
    expect({ x: star.x, y: star.y, brightness: star.brightness }).toEqual({ x, y, brightness });
  });

  it('drifts downward and wraps at the bottom edge', () => {
    const env = makeEnv();
    const star = new Star(env);
    star.y = env.canvas.height - 0.01;
    star.speedY = 1;
    star.update();
    expect(star.y).toBe(0); // wrapped, not run off-canvas
  });

  it('keeps brightness inside the visible band', () => {
    const star = new Star(makeEnv());
    for (let i = 0; i < 500; i++) star.update();
    expect(star.brightness).toBeGreaterThanOrEqual(0.3);
    expect(star.brightness).toBeLessThanOrEqual(1);
  });

  it('draws light stars on dark and dark stars on light', () => {
    const dark = makeEnv({ isDark: true });
    new Star(dark).draw();
    expect(dark.ctx.fillStyle).toMatch(/^rgba\(255, 255, 255,/);

    const light = makeEnv({ isDark: false });
    new Star(light).draw();
    expect(light.ctx.fillStyle).toMatch(/^rgba\(15, 23, 42,/);
  });

  it('renders smaller stars on mobile', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const mobile = new Star(makeEnv({ isMobile: true }));
    const desktop = new Star(makeEnv({ isMobile: false }));
    expect(mobile.size).toBeLessThan(desktop.size);
  });
});
