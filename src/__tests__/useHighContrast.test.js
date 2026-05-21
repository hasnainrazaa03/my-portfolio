import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHighContrast } from '../hooks/useHighContrast';

describe('useHighContrast', () => {
  let originalMatchMedia;

  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('hc');
    originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    document.documentElement.classList.remove('hc');
    window.localStorage.clear();
  });

  it('defaults to false and does not add the .hc class', () => {
    const { result } = renderHook(() => useHighContrast());
    expect(result.current[0]).toBe(false);
    expect(document.documentElement.classList.contains('hc')).toBe(false);
  });

  it('toggle() flips the value, adds .hc, and persists to localStorage', () => {
    const { result } = renderHook(() => useHighContrast());
    act(() => result.current[2]());
    expect(result.current[0]).toBe(true);
    expect(document.documentElement.classList.contains('hc')).toBe(true);
    expect(window.localStorage.getItem('pref:highContrast')).toBe('true');
  });

  it('reads the persisted value on mount', () => {
    window.localStorage.setItem('pref:highContrast', 'true');
    const { result } = renderHook(() => useHighContrast());
    expect(result.current[0]).toBe(true);
  });

  it('initialises from prefers-contrast: more when no stored preference', () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    const { result } = renderHook(() => useHighContrast());
    expect(result.current[0]).toBe(true);
  });
});
