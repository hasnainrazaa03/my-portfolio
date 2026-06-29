/**
 * scroll.test.js — shared scrollToSection util (Phase 3 / T3.2).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { scrollToSection } from '../utils/scroll.js';

afterEach(() => {
  vi.restoreAllMocks();
});

function stubElement() {
  const scrollIntoView = vi.fn();
  vi.spyOn(document, 'getElementById').mockReturnValue({ scrollIntoView });
  return scrollIntoView;
}

function stubReducedMotion(matches) {
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

describe('scrollToSection', () => {
  it('scrolls smoothly to the target element by default', () => {
    const scrollIntoView = stubElement();
    stubReducedMotion(false);
    scrollToSection('projects');
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  it('uses instant (auto) behavior under prefers-reduced-motion', () => {
    const scrollIntoView = stubElement();
    stubReducedMotion(true);
    scrollToSection('projects');
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
  });

  it('no-ops when the target element is missing (no throw)', () => {
    vi.spyOn(document, 'getElementById').mockReturnValue(null);
    expect(() => scrollToSection('does-not-exist')).not.toThrow();
  });
});
