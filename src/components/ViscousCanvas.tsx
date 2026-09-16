import React, { useEffect, useRef, useState } from 'react';
import { ALPHA_MAX, ALPHA_MIN } from '../utils/flowScene';
import type { FrameMessage, InMessage } from '../lab/flow/worker';

/**
 * ViscousCanvas — the hero's other physics: the lattice-Boltzmann solver
 * (src/lab/flow) running in a Web Worker, painted as vorticity. Same
 * interaction as the ideal-flow canvas: drag to pitch, arrow keys, an ARIA
 * slider. Every frame's lift, drag and "steps held at this angle" go to the
 * parent, which decides when a measurement is settled enough to learn from.
 */

export interface SolverStats {
  cl: number;
  cd: number;
  reynolds: number;
  stepsPerSecond: number;
  stepsAtAngle: number;
  alphaDeg: number;
  diverged: boolean;
  restarts: number;
}

interface Props {
  alphaDeg: number;
  onAlphaChange: (deg: number) => void;
  reynolds: number;
  les: boolean;
  isDark: boolean;
  draggable: boolean;
  running: boolean;
  onFrame: (s: SolverStats) => void;
  /** No Worker in this browser: the parent falls back to ideal flow. */
  onUnavailable: () => void;
  resetToken: number;
  ariaDescribedBy?: string;
  className?: string;
}

/** Coarser than a wind tunnel, finer than a diagram: quick enough for a hero. */
const GRID = { width: 256, height: 104, chord: 64, x0: 56, y0: 52 };
const U0 = 0.1;
const nuFor = (reynolds: number) => (U0 * GRID.chord) / reynolds;

const clampAlpha = (a: number) => Math.min(ALPHA_MAX, Math.max(ALPHA_MIN, Math.round(a * 2) / 2));

const ViscousCanvas = ({ alphaDeg, onAlphaChange, reynolds, les, isDark, draggable, running, onFrame, onUnavailable, resetToken, ariaDescribedBy, className = '' }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const bufferRef = useRef<ArrayBuffer | null>(null);
  const pendingRef = useRef(false);
  const runningRef = useRef(running);
  const onFrameRef = useRef(onFrame);
  const alphaRef = useRef(alphaDeg);
  const dragRef = useRef<{ y: number; alpha: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    runningRef.current = running;
  }, [running]);
  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);
  useEffect(() => {
    alphaRef.current = alphaDeg;
  }, [alphaDeg]);

  const send = (m: InMessage) => workerRef.current?.postMessage(m);

  useEffect(() => {
    if (typeof Worker === 'undefined') {
      onUnavailable();
      return;
    }
    const worker = new Worker(new URL('../lab/flow/worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    let sps = 0;
    worker.onmessage = (e: MessageEvent<FrameMessage>) => {
      const m = e.data;
      pendingRef.current = false;
      bufferRef.current = m.buffer;
      if (ctx) ctx.putImageData(new ImageData(new Uint8ClampedArray(m.buffer), m.width, m.height), 0, 0);
      sps = sps * 0.9 + (m.msThisFrame > 0 ? (m.stepsThisFrame / m.msThisFrame) * 1000 : 0) * 0.1;
      onFrameRef.current({ cl: m.cl, cd: m.cd, reynolds: m.reynolds, stepsPerSecond: sps, stepsAtAngle: m.stepsAtAngle, alphaDeg: m.alphaDeg, diverged: m.diverged, restarts: m.restarts });
    };
    worker.postMessage({
      type: 'init',
      ...GRID,
      alphaDeg: alphaRef.current,
      params: { u0: U0, nu: nuFor(reynolds), les },
      view: 'vorticity',
      theme: isDark ? 'dark' : 'light',
    } satisfies InMessage);
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (document.hidden || !runningRef.current || pendingRef.current) return;
      pendingRef.current = true;
      const buffer = bufferRef.current;
      bufferRef.current = null;
      worker.postMessage({ type: 'frame', budgetMs: 10, buffer } satisfies InMessage, buffer ? [buffer] : []);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      worker.terminate();
      workerRef.current = null;
    };
    // Mount-only: later changes are forwarded by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => send({ type: 'params', params: { u0: U0, nu: nuFor(reynolds), les } }), [reynolds, les]);
  useEffect(() => send({ type: 'angle', alphaDeg }), [alphaDeg]);
  useEffect(() => send({ type: 'theme', theme: isDark ? 'dark' : 'light' }), [isDark]);
  useEffect(() => {
    if (resetToken > 0) send({ type: 'reset' });
  }, [resetToken]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggable) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { y: e.clientY, alpha: alphaRef.current };
    setDragging(true);
    e.currentTarget.focus({ preventScroll: true });
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const height = e.currentTarget.clientHeight || 1;
    onAlphaChange(clampAlpha(drag.alpha + ((drag.y - e.clientY) / (height * 0.6)) * (ALPHA_MAX - ALPHA_MIN)));
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? -1 : 0;
    if (e.key === 'Home') onAlphaChange(ALPHA_MIN);
    else if (e.key === 'End') onAlphaChange(ALPHA_MAX);
    else if (step) onAlphaChange(clampAlpha(alphaDeg + step));
    else return;
    e.preventDefault();
  };

  return (
    <div
      className={`select-none overflow-hidden rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${draggable ? (dragging ? 'cursor-grabbing' : 'cursor-ns-resize') : ''} ${draggable ? 'touch-none' : ''} ${className}`}
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
      onPointerLeave={endDrag}
      onKeyDown={onKeyDown}
    >
      <canvas ref={canvasRef} width={GRID.width} height={GRID.height} aria-hidden="true" className="block h-full w-full" />
      <span className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/40 px-1.5 py-0.5 text-[10px] text-white/80">
        Lattice-Boltzmann · {GRID.width}×{GRID.height} cells
      </span>
    </div>
  );
};

export default ViscousCanvas;
