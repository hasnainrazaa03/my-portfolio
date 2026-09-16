import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Pause, Play, RotateCcw } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { MAX_U0 } from '../lab/flow/lbm';
import type { FrameMessage, InMessage, View } from '../lab/flow/worker';
import { PROJECTS } from '../constants';
import { projectPath } from '../utils/slug';

/**
 * FlowLabPage — a lattice-Boltzmann flow solver around the NACA 4412,
 * running in a Web Worker, with the knobs a wind-tunnel would have:
 * speed, viscosity (as a Reynolds number), angle of attack, and a
 * large-eddy turbulence model. Vorticity or speed on the canvas; lift and
 * drag coefficients from the force on the body.
 *
 * What it can show that the hero's ideal-flow model cannot: a boundary
 * layer, separation on the upper surface at high angle, a recirculating
 * wake, and vortex shedding. What it is not: the CFD study's results.
 */

const GRID = { width: 320, height: 128, chord: 84, x0: 76, y0: 64 };
const ASPECT = `${GRID.width} / ${GRID.height}`;

interface Settings {
  reynolds: number;
  u0: number;
  alphaDeg: number;
  les: boolean;
  view: View;
}

const PRESETS: { label: string; hint: string; s: Partial<Settings> }[] = [
  { label: 'Creeping', hint: 'Re 20: viscous, attached, steady', s: { reynolds: 20, u0: 0.06, alphaDeg: 4, les: false } },
  { label: 'Laminar', hint: 'Re 200: a steady wake begins to waver', s: { reynolds: 200, u0: 0.08, alphaDeg: 4, les: false } },
  { label: 'Separation', hint: 'Re 800 at 14°: the upper surface lets go', s: { reynolds: 800, u0: 0.1, alphaDeg: 14, les: false } },
  { label: 'Turbulent wake', hint: 'Re 4,000 with the eddy model', s: { reynolds: 4000, u0: 0.12, alphaDeg: 8, les: true } },
];

const RE_MIN = 10;
const RE_MAX = 8000;
const logToRe = (v: number) => Math.round(Math.exp(Math.log(RE_MIN) + (v / 1000) * (Math.log(RE_MAX) - Math.log(RE_MIN))));
const reToLog = (re: number) => Math.round(((Math.log(re) - Math.log(RE_MIN)) / (Math.log(RE_MAX) - Math.log(RE_MIN))) * 1000);
const nuFor = (s: Settings) => (s.u0 * GRID.chord) / s.reynolds;

const naca = PROJECTS.find((p) => /NACA 4412/.test(p.title));

const FlowLabPage = () => {
  const { isDark } = useTheme();
  const reduced = useReducedMotion();
  const [settings, setSettings] = useState<Settings>({ reynolds: 800, u0: 0.1, alphaDeg: 14, les: false, view: 'vorticity' });
  const [running, setRunning] = useState(!reduced);
  const [stats, setStats] = useState<{ steps: number; sps: number; cl: number; cd: number; reynolds: number; diverged: boolean } | null>(null);
  const [supported, setSupported] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const bufferRef = useRef<ArrayBuffer | null>(null);
  const runningRef = useRef(running);
  const pendingRef = useRef(false);
  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  const send = useCallback((m: InMessage) => workerRef.current?.postMessage(m), []);

  // Start the worker once; settings changes are sent as messages.
  useEffect(() => {
    if (typeof Worker === 'undefined') {
      setSupported(false);
      return;
    }
    const worker = new Worker(new URL('../lab/flow/worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    let lastSps = 0;
    worker.onmessage = (e: MessageEvent<FrameMessage>) => {
      const m = e.data;
      pendingRef.current = false;
      bufferRef.current = m.buffer;
      if (ctx && canvas) {
        const img = new ImageData(new Uint8ClampedArray(m.buffer), m.width, m.height);
        ctx.putImageData(img, 0, 0);
      }
      lastSps = lastSps * 0.9 + (m.msThisFrame > 0 ? (m.stepsThisFrame / m.msThisFrame) * 1000 : 0) * 0.1;
      setStats({ steps: m.steps, sps: lastSps, cl: m.cl, cd: m.cd, reynolds: m.reynolds, diverged: m.diverged });
    };
    const initial: Settings = { reynolds: 800, u0: 0.1, alphaDeg: 14, les: false, view: 'vorticity' };
    worker.postMessage({
      type: 'init',
      ...GRID,
      alphaDeg: initial.alphaDeg,
      params: { u0: initial.u0, nu: nuFor(initial), les: initial.les },
      view: initial.view,
      theme: isDark ? 'dark' : 'light',
    } satisfies InMessage);

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (document.hidden || !runningRef.current || pendingRef.current) return;
      pendingRef.current = true;
      const buffer = bufferRef.current;
      bufferRef.current = null;
      worker.postMessage({ type: 'frame', budgetMs: 11, buffer } satisfies InMessage, buffer ? [buffer] : []);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      worker.terminate();
      workerRef.current = null;
    };
    // Mount-only: the theme and settings are forwarded by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => send({ type: 'theme', theme: isDark ? 'dark' : 'light' }), [isDark, send]);
  useEffect(() => send({ type: 'params', params: { u0: settings.u0, nu: nuFor(settings), les: settings.les } }), [settings.u0, settings.reynolds, settings.les, send, settings]);
  useEffect(() => send({ type: 'angle', alphaDeg: settings.alphaDeg }), [settings.alphaDeg, send]);
  useEffect(() => send({ type: 'view', view: settings.view }), [settings.view, send]);

  const update = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }));
  const reset = () => {
    send({ type: 'reset' });
    setRunning(true);
  };
  const nu = useMemo(() => nuFor(settings), [settings]);
  const tauWarn = 3 * nu + 0.5 < 0.51;

  return (
    <main className="min-h-screen bg-white text-slate-800 dark:bg-[#030014] dark:text-slate-200">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <a href="/" className="inline-flex items-center gap-2 rounded text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <ArrowLeft size={16} aria-hidden="true" /> Home
        </a>
        <p className="mt-8 text-[11px] font-semibold uppercase tracking-widest text-primary">Lattice-Boltzmann solver · runs in your browser</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">Real flow around a NACA 4412</h1>
        <p className="mt-3 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
          The front page draws ideal flow, which never separates. This solves the flow equations on a grid, with viscosity, so
          the boundary layer can let go: raise the angle and watch the upper surface separate; raise the Reynolds number and
          watch the wake shed vortices.
        </p>

        {!supported ? (
          <p className="mt-8 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">This browser cannot run the solver in a background thread.</p>
        ) : (
          <>
            {/* The field */}
            <div className="relative mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-[#f8fafc] dark:border-white/10 dark:bg-[#0f0d1f]">
              <canvas
                ref={canvasRef}
                width={GRID.width}
                height={GRID.height}
                className="block w-full"
                style={{ aspectRatio: ASPECT, imageRendering: 'auto' }}
                role="img"
                aria-label={`${settings.view === 'vorticity' ? 'Vorticity' : 'Speed'} of the flow around a NACA 4412 at ${settings.alphaDeg} degrees, Reynolds number ${settings.reynolds}`}
              />
              <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-white/75 px-2 py-1 text-[11px] font-medium text-slate-700 backdrop-blur dark:bg-black/45 dark:text-slate-200">
                2D lattice-Boltzmann, {GRID.width}×{GRID.height} cells{settings.les ? ' · Smagorinsky LES' : ''}
              </div>
              {stats && (
                <div className="pointer-events-none absolute right-3 top-3 rounded-md bg-white/75 px-2.5 py-1.5 font-mono text-[11px] tabular-nums text-slate-700 backdrop-blur dark:bg-black/45 dark:text-slate-200">
                  Re {Math.round(stats.reynolds).toLocaleString()} · C<sub>l</sub> {stats.cl.toFixed(2)} · C<sub>d</sub> {stats.cd.toFixed(2)} ·{' '}
                  {Math.round(stats.sps).toLocaleString()} steps/s
                </div>
              )}
              {settings.view === 'vorticity' && (
                <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-md bg-white/75 px-2 py-1 text-[11px] text-slate-700 backdrop-blur dark:bg-black/45 dark:text-slate-200">
                  <span aria-hidden="true" className="inline-block h-2 w-4 rounded" style={{ background: 'var(--arc-ai)' }} /> clockwise
                  <span aria-hidden="true" className="ml-1 inline-block h-2 w-4 rounded" style={{ background: 'var(--viz-model)' }} /> anticlockwise
                </div>
              )}
              {stats?.diverged && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 p-6 text-center text-sm text-white">
                  <p>
                    The solver became unstable at this setting: too fast for the grid at this viscosity. Lower the speed or the Reynolds number, or
                    turn on the turbulence model, then reset.
                  </p>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  title={p.hint}
                  onClick={() => {
                    update(p.s);
                    reset();
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/20"
                >
                  {p.label}
                </button>
              ))}
              <span className="mx-1 hidden h-6 w-px bg-slate-300 dark:bg-white/15 sm:block" />
              <button
                type="button"
                onClick={() => setRunning((r) => !r)}
                aria-pressed={running}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/20"
              >
                {running ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
                {running ? 'Pause' : 'Run'}
              </button>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/20"
              >
                <RotateCcw size={14} aria-hidden="true" /> Reset flow
              </button>
            </div>

            <div className="mt-5 grid gap-5 rounded-2xl border border-slate-200 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.03] md:grid-cols-3">
              <Control
                id="flow-angle"
                label="Angle of attack"
                unit="°"
                min={-5}
                max={20}
                step={0.5}
                value={settings.alphaDeg}
                onChange={(v) => update({ alphaDeg: v })}
                hint="Past about 12° the upper surface separates."
              />
              <Control
                id="flow-re"
                label="Reynolds number"
                unit=""
                min={0}
                max={1000}
                step={1}
                value={reToLog(settings.reynolds)}
                display={settings.reynolds}
                onChange={(v) => update({ reynolds: logToRe(v) })}
                onType={(v) => update({ reynolds: Math.min(RE_MAX, Math.max(RE_MIN, v)) })}
                hint={`U·c/ν with ν = ${nu.toFixed(4)} lattice units.${tauWarn ? ' Near the stability floor: the eddy model helps.' : ''}`}
              />
              <Control
                id="flow-speed"
                label="Inlet speed"
                unit=""
                min={0.02}
                max={MAX_U0}
                step={0.005}
                value={settings.u0}
                onChange={(v) => update({ u0: v })}
                hint="Lattice units; capped well below the lattice speed of sound."
              />
              <div className="flex flex-wrap items-center gap-4 md:col-span-3">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={settings.les} onChange={(e) => update({ les: e.target.checked })} className="h-4 w-4 accent-[var(--arc-ai)]" />
                  Turbulence model (Smagorinsky large-eddy)
                </label>
                <fieldset className="inline-flex items-center gap-3 text-sm">
                  <legend className="sr-only">View</legend>
                  {(['vorticity', 'speed'] as const).map((v) => (
                    <label key={v} className="inline-flex items-center gap-1.5">
                      <input type="radio" name="flow-view" value={v} checked={settings.view === v} onChange={() => update({ view: v })} className="accent-[var(--arc-ai)]" />
                      {v === 'vorticity' ? 'Vorticity' : 'Speed'}
                    </label>
                  ))}
                </fieldset>
              </div>
            </div>
          </>
        )}

        <section className="mt-12 grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-primary">What to look for</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              <li>At low Reynolds number the flow hugs the body and the wake is steady: viscosity wins.</li>
              <li>Raise the angle and a region of reversed flow grows on the upper surface — separation, the beginning of stall. The lift coefficient stops rising.</li>
              <li>Raise the Reynolds number and the wake goes unsteady: vortices of alternating sign peel off the trailing edge, and the lift and drag readouts oscillate with them.</li>
              <li>The turbulence model adds viscosity where the shear is strong, which keeps the solver stable at settings the plain scheme cannot hold, at the cost of smoothing the smallest eddies.</li>
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-primary">What this is, and is not</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              <li>A D2Q9 lattice-Boltzmann solver with BGK collision, half-way bounce-back on the body, a velocity inlet, a zero-gradient outlet and periodic top and bottom. Lift and drag come from momentum exchange at the surface.</li>
              <li>Two-dimensional, coarse, and weakly compressible; the highest Reynolds numbers here are under-resolved, so treat the turbulent settings as a picture of the mechanism, not a measurement.</li>
              <li>
                Not the results of the{' '}
                {naca ? (
                  <a href={projectPath(naca.title)} className="text-primary underline-offset-2 hover:underline">
                    NACA 4412 study
                  </a>
                ) : (
                  'NACA 4412 study'
                )}
                , which used ANSYS Fluent with a turbulence model on a far finer mesh. Same section, different tool.
              </li>
              <li>
                The{' '}
                <a href="/#hero" className="text-primary underline-offset-2 hover:underline">
                  front page
                </a>{' '}
                shows the ideal-flow picture: no viscosity, no separation, ever. This page is what that idealisation leaves out.
              </li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
};

/** A slider with a typed value beside it: type a number or drag, same state. */
const Control = ({
  id,
  label,
  unit,
  min,
  max,
  step,
  value,
  display,
  onChange,
  onType,
  hint,
}: {
  id: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
  /** Shown in the number box when the slider's scale is not the value's (log Reynolds). */
  display?: number;
  onChange: (v: number) => void;
  onType?: (v: number) => void;
  hint: string;
}) => (
  <div>
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        {label}
      </label>
      <span className="inline-flex items-center gap-1 text-sm">
        <input
          id={`${id}-number`}
          aria-label={`${label}, typed`}
          type="number"
          value={display ?? value}
          min={display !== undefined ? undefined : min}
          max={display !== undefined ? undefined : max}
          step={display !== undefined ? 1 : step}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (!Number.isFinite(v)) return;
            if (onType) onType(v);
            else onChange(Math.min(max, Math.max(min, v)));
          }}
          className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-right tabular-nums text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/20 dark:bg-black/30 dark:text-white"
        />
        <span className="text-slate-500 dark:text-slate-400">{unit}</span>
      </span>
    </div>
    <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-[var(--arc-ai)]" />
    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
  </div>
);

export default FlowLabPage;
