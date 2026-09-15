import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { advect, joukowski, liftCoefficient, fromView, toView, toZ, toZeta, velocityAtZeta, type Complex } from '../utils/potentialFlow';
import { ALPHA_DEFAULT, ALPHA_MAX, ALPHA_MIN, VIEW, rad, scene } from '../utils/flowScene';
import FlowFieldStatic from './FlowFieldStatic';

/**
 * FlowField — the hero visual: ideal flow around an airfoil, live.
 *
 * WHY THIS AND NOT A SPINNING SHAPE: the previous hero was a wireframe
 * icosahedron with rings, which said "tech" and nothing else. This is the
 * first thing an aerospace course teaches, drawn from its closed form: the
 * cursor pitches the airfoil, the particles find the new streamlines, the
 * flow over the top speeds up and the lift readout follows. It is the
 * background that became the ML career, in one picture.
 *
 * It is an ideal-flow model and is labelled as one on screen. Nothing here
 * is a CFD result (see potentialFlow.ts).
 *
 * Rendering: Canvas 2D, two layers. The base layer holds the airfoil and a
 * fan of faint streamlines, redrawn only when the angle or the size changes.
 * The particle layer is redrawn every frame: the previous frame is faded
 * with destination-out (which works on a transparent canvas, so the page's
 * own background shows through in both themes), then each particle draws a
 * short streak coloured by its speed — amber where the flow slows, teal
 * where it is fast. Particles live in the ζ-plane, where the airfoil is a
 * circle they cannot enter; only their drawn position is mapped.
 *
 * The canvas is never on the wire for phones: Hero mounts it at md+ only.
 * Under prefers-reduced-motion or Save-Data, or when a 2D context cannot be
 * had, the static SVG picture takes its place.
 */

const MAX_PARTICLES = 2600;
const EDGE_MASK = 'radial-gradient(ellipse 62% 58% at 50% 50%, black 55%, transparent 100%)';
const DPR_CAP = 1.5;

/** Slow (stagnation) → freestream → fast (over the top), as RGB stops. */
const SLOW = [217, 119, 6]; // --arc-aerospace amber-600
const FAST_DARK = [45, 212, 191]; // primary teal (dark theme)
const FAST_LIGHT = [15, 118, 110]; // primary teal (light theme)

function speedColour(s: number, fast: number[]): string {
  // s is |V|/U. Below 0.8 blend towards amber, above 1.2 brighten.
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
  /** Last drawn position in view coordinates, for the streak. */
  px: number;
  py: number;
  /** Frames spent near stagnation, to recycle a particle stuck at the nose. */
  stuck: number;
}



interface Props {
  /** False draws the still picture: Save-Data, or the caller's choice. */
  motion?: boolean;
}

const FlowField = ({ motion = true }: Props) => {
  const { isDark } = useTheme();
  const af = useMemo(() => joukowski(), []);
  const [alphaDeg, setAlphaDeg] = useState(ALPHA_DEFAULT);
  const [fallback, setFallback] = useState(false);
  const [hover, setHover] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const partRef = useRef<HTMLCanvasElement>(null);
  // The animation loop reads α through a ref so a change does not restart it.
  const alphaRef = useRef(alphaDeg);
  useEffect(() => {
    alphaRef.current = alphaDeg;
  }, [alphaDeg]);
  const hintId = useId();

  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const animate = motion && !reducedMotion && !fallback;

  // The base layer: airfoil + streamlines, whenever α, size or theme changes.
  useEffect(() => {
    if (!animate) return;
    const canvas = baseRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setFallback(true);
      return;
    }

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

      // Streamlines fill whatever height the column has, not the SVG's window.
      const { lines, outline } = scene(af, alphaRef.current, cy / scale);
      ctx.lineWidth = 1;
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.13)';
      ctx.lineJoin = 'round';
      for (const line of lines) {
        ctx.beginPath();
        line.forEach((p, i) => (i ? ctx.lineTo(X(p.re), Y(p.im)) : ctx.moveTo(X(p.re), Y(p.im))));
        ctx.stroke();
      }

      ctx.beginPath();
      outline.forEach((p, i) => (i ? ctx.lineTo(X(p.re), Y(p.im)) : ctx.moveTo(X(p.re), Y(p.im))));
      ctx.closePath();
      ctx.fillStyle = isDark ? '#0b0a1a' : '#0f172a';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = isDark ? 'rgba(45,212,191,0.9)' : 'rgba(15,118,110,0.9)';
      ctx.stroke();
    };

    draw();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(draw) : null;
    ro?.observe(wrap);
    return () => ro?.disconnect();
  }, [af, alphaDeg, isDark, animate]);

  // The particle layer.
  useEffect(() => {
    if (!animate) return;
    const canvas = partRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setFallback(true);
      return;
    }

    const fast = isDark ? FAST_DARK : FAST_LIGHT;
    let width = 0;
    let height = 0;
    let scale = 1;
    let halfHeight = VIEW.halfHeight;
    let particles: Particle[] = [];

    const spawn = (anywhere: boolean): Particle => {
      const alpha = rad(alphaRef.current);
      const vx = anywhere ? VIEW.left + Math.random() * (VIEW.right - VIEW.left) : VIEW.left - Math.random() * 0.5;
      const vy = (Math.random() * 2 - 1) * halfHeight;
      const zeta = toZeta(af, fromView(alpha, { re: vx, im: vy }));
      return { zeta, px: NaN, py: NaN, stuck: 0 };
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
      const count = Math.min(MAX_PARTICLES, Math.round((width * height) / 320));
      particles = Array.from({ length: count }, () => spawn(true));
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
      // Real time, clamped so a background tab does not fast-forward.
      const dt = Math.min(0.05, (now - last) / 1000) * 4;
      last = now;

      const alpha = rad(alphaRef.current);
      const cy = height / 2;

      // Fade the last frame instead of clearing it: streaks with a tail.
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
  }, [af, isDark, animate]);

  if (!animate) return <FlowFieldStatic alphaDeg={alphaDeg} />;

  /** Cursor height → angle: top of the box is nose-up. */
  const onPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const t = 1 - Math.min(1, Math.max(0, (e.clientY - box.top) / box.height));
    setAlphaDeg(Math.round((ALPHA_MIN + t * (ALPHA_MAX - ALPHA_MIN)) * 2) / 2);
  };
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? -1 : 0;
    if (e.key === 'Home') setAlphaDeg(ALPHA_MIN);
    else if (e.key === 'End') setAlphaDeg(ALPHA_MAX);
    else if (step) setAlphaDeg((a) => Math.min(ALPHA_MAX, Math.max(ALPHA_MIN, a + step)));
    else return;
    e.preventDefault();
  };

  const cl = liftCoefficient(af, rad(alphaDeg));

  return (
    <div
      ref={wrapRef}
      className="relative h-full min-h-[400px] w-full cursor-crosshair select-none rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      role="slider"
      tabIndex={0}
      aria-label="Angle of attack of the airfoil in the flow picture"
      aria-valuemin={ALPHA_MIN}
      aria-valuemax={ALPHA_MAX}
      aria-valuenow={alphaDeg}
      aria-valuetext={`${alphaDeg} degrees, lift coefficient ${cl.toFixed(2)}`}
      aria-describedby={hintId}
      onPointerMove={onPointer}
      onPointerDown={onPointer}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onKeyDown={onKey}
      style={{ touchAction: 'pan-y' }}
    >
      {/* The canvases are a hard rectangle; a mask fades their edges into the page. */}
      <div className="absolute inset-0" style={{ maskImage: EDGE_MASK, WebkitMaskImage: EDGE_MASK }}>
        <canvas ref={baseRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />
        <canvas ref={partRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 flex flex-col gap-1.5">
        <p className="rounded-md bg-white/70 px-2.5 py-1.5 font-mono text-[11px] leading-tight text-slate-700 backdrop-blur dark:bg-black/40 dark:text-slate-200">
          <span className="font-semibold">Ideal flow</span> · α{' '}
          <span className="tabular-nums">{alphaDeg < 0 ? '−' : ''}{Math.abs(alphaDeg).toFixed(1)}°</span> · cl{' '}
          <span className="tabular-nums">{cl.toFixed(2)}</span>
        </p>
        <p className="flex items-center gap-2 px-1 text-[10px] text-slate-500 dark:text-slate-400">
          <span aria-hidden="true" className="inline-block h-1.5 w-4 rounded-full" style={{ background: `rgb(${SLOW.join(',')})` }} />
          slow
          <span aria-hidden="true" className="ml-1 inline-block h-1.5 w-4 rounded-full bg-primary" />
          fast
        </p>
      </div>

      <p
        id={hintId}
        className={`pointer-events-none absolute right-3 top-3 rounded-md px-2 py-1 text-[11px] text-slate-500 transition-opacity dark:text-slate-400 ${hover ? 'opacity-100' : 'opacity-0'}`}
      >
        Move up or down to pitch the airfoil · arrow keys work too
      </p>
    </div>
  );
};

export default FlowField;
