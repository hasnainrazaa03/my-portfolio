/**
 * Cursor-following "thruster glow" — a soft radial light that trails the
 * pointer for a tiny aerospace flourish. Cheap (single fixed div, raf-
 * throttled mousemove) and accessibility-aware:
 *
 *  - Hidden when `(pointer: coarse)` matches (touch devices) — there's no
 *    cursor to follow there.
 *  - Hidden when the user prefers reduced motion.
 *  - `pointer-events: none` so it never blocks clicks.
 *  - `aria-hidden` because it's purely decorative.
 */
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';

const CursorGlow = () => {
  const elRef = useRef(null);
  const rafRef = useRef(0);
  const reduced = useReducedMotion();
  const [fine, setFine] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mql = window.matchMedia('(pointer: fine)');
    const update = () => setFine(mql.matches);
    update();
    mql.addEventListener?.('change', update);
    return () => mql.removeEventListener?.('change', update);
  }, []);

  const enabled = fine && !reduced;

  useEffect(() => {
    if (!enabled) return undefined;
    let pendingX = 0;
    let pendingY = 0;
    const apply = () => {
      const el = elRef.current;
      if (el) el.style.transform = `translate3d(${pendingX - 150}px, ${pendingY - 150}px, 0)`;
      rafRef.current = 0;
    };
    const onMove = (e) => {
      pendingX = e.clientX;
      pendingY = e.clientY;
      if (!rafRef.current) rafRef.current = requestAnimationFrame(apply);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={elRef}
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-[5] h-[300px] w-[300px] rounded-full opacity-40 mix-blend-screen"
      style={{
        background:
          'radial-gradient(circle, rgba(56,189,248,0.35) 0%, rgba(56,189,248,0.10) 35%, rgba(56,189,248,0) 70%)',
        transition: 'opacity 300ms ease',
        willChange: 'transform',
      }}
    />
  );
};

export default CursorGlow;
