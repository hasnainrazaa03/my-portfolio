import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReducedMotion } from '../hooks/useReducedMotion';

describe('useReducedMotion', () => {
  let listeners;
  let matches;
  let originalMatchMedia;

  beforeEach(() => {
    listeners = [];
    matches = false;
    originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches,
      media: query,
      addEventListener: (_, fn) => listeners.push(fn),
      removeEventListener: (_, fn) => {
        const i = listeners.indexOf(fn);
        if (i !== -1) listeners.splice(i, 1);
      },
    }));
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('returns false when the media query does not match', () => {
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it('returns true when the media query matches at mount', () => {
    matches = true;
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it('updates when the media query changes', () => {
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
    act(() => listeners.forEach((fn) => fn({ matches: true })));
    expect(result.current).toBe(true);
    act(() => listeners.forEach((fn) => fn({ matches: false })));
    expect(result.current).toBe(false);
  });
});
