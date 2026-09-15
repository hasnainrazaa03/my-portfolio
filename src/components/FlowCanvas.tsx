import React, { useEffect, useRef, useState } from 'react';
import { advect, fromView, toView, toZ, toZeta, velocityAtZeta, type Airfoil, type Complex } from '../utils/potentialFlow';
import { ALPHA_MAX, ALPHA_MIN, VIEW, rad, scene } from '../utils/flowScene';

/**
 * FlowCanvas — the animated picture inside the hero: an airfoil in ideal
 * flow that the visitor drags to pitch.
 *
 * Two canvases. The base layer holds the airfoil and a fan of faint
 * streamlines, redrawn when the angle, the size, the theme or the hover
 * state changes. The particle layer runs every frame: the previous frame is
 * faded with destination-out (which keeps the canvas transparent, so the
 * page's own background shows through in both themes), then each particle
 * draws a short streak coloured by its speed. Particles live in the ζ-plane,
 * where the airfoil is a circle they cannot enter; only their drawn position
 * is mapped.
 *
 * Bright points leave the trailing edge for the right edge of the picture,
 * where the network panel sits — densely while the physics is being sampled,
 * sparsely while the model learns, not at all once it is trained: the
 * physics handing its samples to the model. It is a visual for the phases,
 * not the data path itself, which is a plain array in FlowField.
 *
 * Interaction: drag anywhere on the picture to pitch (vertical distance maps
 * to angle), arrow keys, Home and End when focused. The element is an ARIA
 * slider for the angle of attack. Phones keep pan-y scrolling and pitch with
 * the range input FlowField renders instead, so `draggable` is false there.
 *
 * The root has no position class of its own: the caller positions it, and a
 * `relative` here once beat the caller's `absolute inset-0`, leaving a
 * zero-height box and an empty picture.
 */

interface Props {
  af: Airfoil;
  alphaDeg: number;
  onAlphaChange: (deg: number) => void;
  isDark: boolean;
  /** Milliseconds between sample points leaving the trailing edge; 0 for none. */
  emitEveryMs: number;
  draggable: boolean;
  /** The 2D context could not be created; the caller shows the still picture. */
  onUnavailable: () => void;
  ariaDescribedBy?: string;
  className?: string;
}

const MAX_PARTICLES = 2200;
const DPR_CAP = 1.5;
const EDGE_MASK = 'radial-gradient(ellipse 60% 60% at 45% 50%, black 50%, transparent 100%)';
/** Slow (stagnation) → freestream → fast (over the top). */
const SLOW = [217, 119, 6];
const FAST_DARK = [45, 212, 191];
const FAST_LIGHT = [15, 118, 110];
const MODEL_DARK = 'rgba(144,133,233,';
const MODEL_LIGHT = 'rgba(74,58,167,';
const PULSE_LIFE_MS = 900;

function speedColour(s: number, fast: number[]): string {
  let r: number, g: number, b: number;
  if (s < 1) {
    const t = Math.min(1, Math.max(0, (1 - s) / 0.6));
    r = fast[0] + (SLOW[0] - fast[0]) * t;
    g = fast[1] + (SLOW[1] - fast[1]) * t;
    b = fast[2] + (SLOW[2] - fast[2]) * t;
  } else {
    const t = Math.min(1, (s - 1) / 0.8) * 0.55;
    r = fast[0] + (255 - fast[0]) * t;
    g = fast[1] + (255 - fast[1]) * t;
    b = fast[2] + (255 - fast[2]) * t;
  }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

interface Particle {
  zeta: Complex;
  px: number;
  py: number;
  stuck: number;
}

interface Pulse {
  born: number;
  y0: number;
}

const clampAlpha = (a: number) => Math.min(ALPHA_MAX, Math.max(ALPHA_MIN, Math.round(a * 2) / 2));

const FlowCanvas = ({ af, alphaDeg, onAlphaChange, isDark, emitEveryMs, draggable, onUnavailable, ariaDescribedBy, className = '' }: Props) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const partRef = useRef<HTMLCanvasElement>(null);
  const [hovering, setHovering] = useState(false);
  const [dragging, setDragging] = useState(false);
  // The drag hint shows on the first hover and goes for good after the first drag.
  const [inside, setInside] = useState(false);
  const [dragged, setDragged] = useState(false);
  const [hintAt, setHintAt] = useState({ x: 0, y: 0 });
  // The loops read these through refs so a change never restarts them.
  const alphaRef = useRef(alphaDeg);
  const emitRef = useRef(emitEveryMs);
  const bboxRef = useRef({ x0: 0, x1: 0, y0: 0, y1: 0 });
  const dragRef = useRef<{ y: number; alpha: number } | null>(null);
  useEffect(() => {
    alphaRef.current = alphaDeg;
  }, [alphaDeg]);
  useEffect(() => {
    emitRef.current = emitEveryMs;
  }, [emitEveryMs]);

  // Base layer.
  useEffect(() => {
    const canvas = baseRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      onUnavailable();
      return;
    }
    const lit = hovering || dragging;

    const draw = () => {
      const width = wrap.clientWidth || 1;
      const height = wrap.clientHeight || 1;
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const scale = width / (VIEW.right - VIEW.left);
      const cy = height / 2;
      const X = (re: number) => (re - VIEW.left) * scale;
      const Y = (im: number) => cy - im * scale;

      const { lines, outline } = scene(af, alphaRef.current, cy / scale);
      ctx.lineWidth = 1;
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.13)';
      ctx.lineJoin = 'round';
      for (const line of lines) {
        ctx.beginPath();
        line.forEach((p, i) => (i ? ctx.lineTo(X(p.re), Y(p.im)) : ctx.moveTo(X(p.re), Y(p.im))));
        ctx.stroke();
      }

      const xs = outline.map((p) => X(p.re));
      const ys = outline.map((p) => Y(p.im));
      bboxRef.current = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };

      ctx.beginPath();
      outline.forEach((p, i) => (i ? ctx.lineTo(X(p.re), Y(p.im)) : ctx.moveTo(X(p.re), Y(p.im))));
      ctx.closePath();
      ctx.save();
      if (lit) {
        ctx.shadowColor = isDark ? 'rgba(45,212,191,0.85)' : 'rgba(15,118,110,0.6)';
        ctx.shadowBlur = 18;
      }
      ctx.fillStyle = isDark ? '#0b0a1a' : '#0f172a';
      ctx.fill();
      ctx.lineWidth = lit ? 2.2 : 1.5;
      ctx.strokeStyle = isDark ? 'rgba(45,212,191,0.95)' : 'rgba(15,118,110,0.95)';
      ctx.stroke();
      ctx.restore();
    };

    draw();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(draw) : null;
    ro?.observe(wrap);
    return () => ro?.disconnect();
  }, [af, alphaDeg, isDark, hovering, dragging, onUnavailable]);

  // Particle layer.
  useEffect(() => {
    const canvas = partRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      onUnavailable();
      return;
    }

    const fast = isDark ? FAST_DARK : FAST_LIGHT;
    const model = isDark ? MODEL_DARK : MODEL_LIGHT;
    let width = 0;
    let height = 0;
    let scale = 1;
    let halfHeight = VIEW.halfHeight;
    let particles: Particle[] = [];
    const pulses: Pulse[] = [];
    let lastPulse = 0;

    const spawn = (anywhere: boolean): Particle => {
      const alpha = rad(alphaRef.current);
      const vx = anywhere ? VIEW.left + Math.random() * (VIEW.right - VIEW.left) : VIEW.left - Math.random() * 0.5;
      const vy = (Math.random() * 2 - 1) * halfHeight;
      return { zeta: toZeta(af, fromView(alpha, { re: vx, im: vy })), px: NaN, py: NaN, stuck: 0 };
    };

    const size = () => {
      width = wrap.clientWidth || 1;
      height = wrap.clientHeight || 1;
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scale = width / (VIEW.right - VIEW.left);
      halfHeight = height / 2 / scale;
      particles = Array.from({ length: Math.min(MAX_PARTICLES, Math.round((width * height) / 320)) }, () => spawn(true));
    };
    size();

    let visible = true;
    let rafId = 0;
    let last = performance.now();

    const frame = (now: number) => {
      rafId = requestAnimationFrame(frame);
      if (!visible || document.hidden) {
        last = now;
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000) * 4;
      last = now;

      const alpha = rad(alphaRef.current);
      const cy = height / 2;

      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.14)';
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const { u, v } = velocityAtZeta(af, alpha, p.zeta);
        const speed = Math.hypot(u, v);
        p.zeta = advect(af, alpha, p.zeta, dt);
        const view = toView(alpha, toZ(af, p.zeta));
        const x = (view.re - VIEW.left) * scale;
        const y = cy - view.im * scale;
        const gone = view.re > VIEW.right + 0.3 || Math.abs(view.im) > halfHeight + 0.5 || !Number.isFinite(x);
        if (speed < 0.05) p.stuck += 1;
        if (gone || p.stuck > 90) {
          particles[i] = spawn(false);
          continue;
        }
        if (Number.isFinite(p.px)) {
          ctx.strokeStyle = speedColour(speed, fast);
          ctx.globalAlpha = 0.35 + Math.min(0.5, speed * 0.4);
          ctx.beginPath();
          ctx.moveTo(p.px, p.py);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
        p.px = x;
        p.py = y;
      }

      // Samples leaving the trailing edge for the model.
      if (emitRef.current > 0 && now - lastPulse > emitRef.current) {
        lastPulse = now;
        const te = toView(alpha, { re: 2 * af.a, im: 0 });
        pulses.push({ born: now, y0: cy - te.im * scale });
      }
      const teX = (toView(alpha, { re: 2 * af.a, im: 0 }).re - VIEW.left) * scale;
      for (let i = pulses.length - 1; i >= 0; i--) {
        const t = (now - pulses[i].born) / PULSE_LIFE_MS;
        if (t >= 1) {
          pulses.splice(i, 1);
          continue;
        }
        const e = t * t * (3 - 2 * t);
        const x = teX + (width - teX) * e;
        const y = pulses[i].y0 + (cy - pulses[i].y0) * e;
        ctx.globalAlpha = 1;
        ctx.fillStyle = `${model}${(0.9 * (1 - t * 0.5)).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(x, y, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    rafId = requestAnimationFrame(frame);

    const observer =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
          })
        : null;
    observer?.observe(wrap);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(size) : null;
    ro?.observe(wrap);
    return () => {
      cancelAnimationFrame(rafId);
      observer?.disconnect();
      ro?.disconnect();
    };
  }, [af, isDark, onUnavailable]);

  const overAirfoil = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    const b = bboxRef.current;
    return x > b.x0 - 28 && x < b.x1 + 28 && y > b.y0 - 28 && y < b.y1 + 28;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggable) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { y: e.clientY, alpha: alphaRef.current };
    setDragging(true);
    setDragged(true);
    e.currentTarget.focus({ preventScroll: true });
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggable) return;
    const drag = dragRef.current;
    if (drag) {
      // Nose-up means the pointer moved up: the full range over ~60% of the height.
      const height = e.currentTarget.clientHeight || 1;
      onAlphaChange(clampAlpha(drag.alpha + ((drag.y - e.clientY) / (height * 0.6)) * (ALPHA_MAX - ALPHA_MIN)));
      return;
    }
    const over = overAirfoil(e);
    if (over !== hovering) setHovering(over);
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      dragRef.current = null;
      setDragging(false);
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? -1 : 0;
    if (e.key === 'Home') onAlphaChange(ALPHA_MIN);
    else if (e.key === 'End') onAlphaChange(ALPHA_MAX);
    else if (step) onAlphaChange(clampAlpha(alphaDeg + step));
    else return;
    e.preventDefault();
  };

  const cursor = !draggable ? '' : dragging ? 'cursor-grabbing' : hovering ? 'cursor-grab' : 'cursor-ns-resize';
  const showHint = draggable && inside && !dragged;

  return (
    <div
      ref={wrapRef}
      className={`select-none rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${cursor} ${draggable ? 'touch-none' : ''} ${className}`}
      role="slider"
      tabIndex={0}
      aria-label="Angle of attack of the airfoil"
      aria-valuemin={ALPHA_MIN}
      aria-valuemax={ALPHA_MAX}
      aria-valuenow={alphaDeg}
      aria-valuetext={`${alphaDeg} degrees`}
      aria-describedby={ariaDescribedBy}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerEnter={() => {
        const b = bboxRef.current;
        setHintAt({ x: (b.x0 + b.x1) / 2, y: b.y0 });
        setInside(true);
      }}
      onPointerLeave={(e) => {
        endDrag(e);
        setInside(false);
        if (hovering) setHovering(false);
      }}
      onKeyDown={onKeyDown}
    >
      <div className="absolute inset-0" style={{ maskImage: EDGE_MASK, WebkitMaskImage: EDGE_MASK }}>
        <canvas ref={baseRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />
        <canvas ref={partRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />
      </div>
      {showHint && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-full items-center gap-1.5 rounded-md bg-slate-900/85 px-2.5 py-1 text-xs font-medium text-white shadow-lg dark:bg-white/90 dark:text-slate-900"
          style={{ left: hintAt.x, top: hintAt.y - 10 }}
        >
          <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor"><path d="M5 0l4 5H1zM5 16l4-5H1z" /></svg>
          Drag to change angle
        </div>
      )}
    </div>
  );
};

export default FlowCanvas;
