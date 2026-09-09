/**
 * useActiveSection.test.js — shared scroll-spy.
 *
 * Two defects lived here. Consumers' id lists were assigned last-writer-wins
 * ("union" in name only), and Navigation — which does not list `hero` and
 * passed a fresh array every render — kept overwriting PageTitleUpdater's
 * list, so `hero` was never watched. And nothing ever reset the active id
 * when no section sat under the spy line, so scrolling back to the top left
 * the last section highlighted and titled forever.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useActiveSection } from '../hooks/useActiveSection';

/** Place a section so that its box straddles (or misses) the 30% spy line. */
function section(id, top, height = 400) {
  const el = document.createElement('section');
  el.id = id;
  el.getBoundingClientRect = () => ({ top, bottom: top + height, left: 0, right: 0, width: 0, height, x: 0, y: top, toJSON() {} });
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  document.body.innerHTML = '';
  window.innerHeight = 1000; // spy line at 300
});

describe('useActiveSection', () => {
  it('reports the section under the spy line', () => {
    section('hero', -2000);
    section('about', 100);
    const { result } = renderHook(() => useActiveSection(['hero', 'about']));
    act(() => window.dispatchEvent(new Event('scroll')));
    expect(result.current).toBe('about');
  });

  it('resets to hero when nothing is under the spy line', () => {
    const about = section('about', 100);
    const { result } = renderHook(() => useActiveSection(['about']));
    act(() => window.dispatchEvent(new Event('scroll')));
    expect(result.current).toBe('about');

    // Scroll back up: `about` now sits far below the spy line.
    about.getBoundingClientRect = () => ({ top: 2000, bottom: 2400, left: 0, right: 0, width: 0, height: 400, x: 0, y: 2000, toJSON() {} });
    act(() => window.dispatchEvent(new Event('scroll')));
    expect(result.current).toBe('hero');
  });

  it('watches the UNION of every consumer\'s ids', () => {
    section('hero', 100); // under the spy line
    section('about', 2000);
    // A consumer that does not list `hero` must still see it become active.
    const nav = renderHook(() => useActiveSection(['about']));
    const title = renderHook(() => useActiveSection(['hero', 'about']));
    act(() => window.dispatchEvent(new Event('scroll')));
    expect(title.result.current).toBe('hero');
    expect(nav.result.current).toBe('hero');
  });
});
