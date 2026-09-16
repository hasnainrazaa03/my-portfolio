import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { joukowski, liftCoefficient } from '../utils/potentialFlow';
import { ALPHA_DEFAULT, ALPHA_MAX, ALPHA_MIN, rad } from '../utils/flowScene';
import { createNet, forward, normaliseAlpha, trainStep, trainingSet, type Net, type Sample } from '../utils/surrogate';
import FlowCanvas from './FlowCanvas';
import ViscousCanvas, { type SolverStats } from './ViscousCanvas';
import FlowFieldStatic from './FlowFieldStatic';
import LiftChart, { type Measured } from './LiftChart';
import SurrogateNet, { type NetSnapshot, type Phase } from './SurrogateNet';

/**
 * FlowField — the hero's interactive story: move the airfoil, generate
 * physics, watch a neural network learn.
 *
 * Two kinds of physics. IDEAL: potential flow from its closed form
 * (potentialFlow.ts) — no viscosity, never separates; the network learns
 * the whole lift curve from it in seconds. VISCOUS: a lattice-Boltzmann
 * solver in a Web Worker (src/lab/flow) with a Reynolds-number control and
 * a turbulence model; the boundary layer separates at high angle and the
 * wake sheds vortices. Here the lift is only known where it has been
 * measured, so the network learns from the angles the visitor holds: each
 * angle held for a moment becomes a training point, and the model fits
 * those. The ideal curve stays on the chart as a faint reference, and the
 * gap past 12° is the stall the ideal model cannot see.
 *
 * Modes. `compact` (phones) keeps the airfoil, a range input to pitch it and
 * the two answers, and drops the diagram and chart. With `motion` off
 * (Save-Data) or under prefers-reduced-motion, or when no 2D context can be
 * had, the still SVG stands in for the canvas and the model is trained
 * synchronously; viscous mode is not offered there.
 */

interface Props {
  motion?: boolean;
  compact?: boolean;
}

type Mode = 'ideal' | 'viscous';

const CONVERGED = 1e-4;
const SAMPLING_MS = 1400;
const PUBLISH_EVERY = 6;
/** Solver steps an angle must be held before its lift counts as measured. */
const MEASURE_STEPS = 800;
const MIN_MEASURED = 3;
const RE_MIN = 20;
const RE_MAX = 5000;
const cloneNet = (n: Net): Net => ({ ...n, w1: [...n.w1], b1: [...n.b1], w2: [...n.w2], vw1: [...n.vw1], vb1: [...n.vb1], vw2: [...n.vw2] });
const logToRe = (v: number) => Math.round(Math.exp(Math.log(RE_MIN) + (v / 1000) * (Math.log(RE_MAX) - Math.log(RE_MIN))));
const reToLog = (re: number) => Math.round(((Math.log(re) - Math.log(RE_MIN)) / (Math.log(RE_MAX) - Math.log(RE_MIN))) * 1000);

/** For the still modes: the finished model, trained here and now. */
function trainToConvergence(seed: number, set: Sample[]): NetSnapshot {
  const net = createNet(seed);
  let loss = Infinity;
  let step = 0;
  while (loss > CONVERGED && step < 4000) {
    loss = trainStep(net, set);
    step += 1;
  }
  return { net, loss, step };
}

const fmtAlpha = (a: number) => `${a < 0 ? '−' : ''}${Math.abs(a).toFixed(1)}°`;
const clampAlpha = (a: number) => Math.min(ALPHA_MAX, Math.max(ALPHA_MIN, Math.round(a * 2) / 2));

const FlowField = ({ motion = true, compact = false }: Props) => {
  const { isDark } = useTheme();
  const af = useMemo(() => joukowski(), []);
  const idealSet = useMemo(() => trainingSet((deg) => liftCoefficient(af, rad(deg))), [af]);
  const [alphaDeg, setAlphaDeg] = useState(ALPHA_DEFAULT);
  const [mode, setMode] = useState<Mode>('ideal');
  const [reynolds, setReynolds] = useState(1000);
  const [les, setLes] = useState(false);
  const [seed, setSeed] = useState(1);
  const [resetToken, setResetToken] = useState(0);
  const [canvasUnavailable, setCanvasUnavailable] = useState(false);
  const [workerUnavailable, setWorkerUnavailable] = useState(false);
  const [phase, setPhase] = useState<Phase>('sampling');
  const [sampleCount, setSampleCount] = useState(0);
  const [snapshot, setSnapshot] = useState<NetSnapshot | null>(null);
  const [solver, setSolver] = useState<SolverStats | null>(null);
  const [measured, setMeasured] = useState<Record<string, number>>({});
  const hintId = useId();
  const sliderId = useId();
  const angleId = useId();
  const reId = useId();
  const lesId = useId();

  const reducedMotion = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const animate = motion && !reducedMotion && !canvasUnavailable;
  const viscous = animate && mode === 'viscous' && !workerUnavailable;
  const onUnavailable = useCallback(() => setCanvasUnavailable(true), []);
  const onWorkerUnavailable = useCallback(() => setWorkerUnavailable(true), []);

  // Still modes: trained now, shown finished.
  const still = useMemo(() => (animate ? null : trainToConvergence(seed, idealSet)), [animate, seed, idealSet]);

  // What the network learns from: the closed form, or the solver's measurements.
  const measuredList: Measured[] = useMemo(
    () =>
      Object.entries(measured)
        .map(([a, cl]) => ({ alphaDeg: Number(a), cl }))
        .sort((p, q) => p.alphaDeg - q.alphaDeg),
    [measured],
  );
  const activeSet: Sample[] = useMemo(
    () => (mode === 'ideal' ? idealSet : measuredList.map((m) => ({ x: normaliseAlpha(m.alphaDeg), y: m.cl }))),
    [mode, idealSet, measuredList],
  );
  const setRef = useRef<{ set: Sample[]; version: number }>({ set: idealSet, version: 0 });
  useEffect(() => {
    setRef.current = { set: activeSet, version: setRef.current.version + 1 };
  }, [activeSet]);

  // A settled measurement at the solver's angle becomes (or refreshes) a training point.
  const onFrame = useCallback((s: SolverStats) => {
    setSolver(s);
    if (s.diverged || s.stepsAtAngle < MEASURE_STEPS) return;
    const key = String(s.alphaDeg);
    setMeasured((prev) => (prev[key] !== undefined && Math.abs(prev[key] - s.cl) < 0.01 ? prev : { ...prev, [key]: s.cl }));
  }, []);

  // Live training. Runs for the life of the mode; idles once converged until
  // the training set changes (a new measurement), then learns again.
  useEffect(() => {
    if (!animate) return;
    const net = createNet(seed);
    let step = 0;
    let loss = Infinity;
    let rafId = 0;
    let started = 0;
    let trainedVersion = -1;
    let localPhase: Phase = 'sampling';
    setPhase('sampling');
    setSampleCount(0);
    setSnapshot({ net: cloneNet(net), loss, step });
    const publish = () => setSnapshot({ net: cloneNet(net), loss, step });

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      if (document.hidden) return;
      if (!started) started = now;
      const { set, version } = setRef.current;
      if (mode === 'ideal') {
        const elapsed = now - started;
        if (elapsed < SAMPLING_MS) {
          setSampleCount(Math.floor((elapsed / SAMPLING_MS) * set.length));
          return;
        }
        if (step === 0) setSampleCount(set.length);
      } else if (set.length < MIN_MEASURED) {
        if (localPhase !== 'sampling') {
          localPhase = 'sampling';
          setPhase('sampling');
        }
        return;
      }
      if (trainedVersion === version) return; // converged on this data
      if (localPhase !== 'learning') {
        localPhase = 'learning';
        setPhase('learning');
      }
      loss = trainStep(net, set);
      step += 1;
      if (loss <= CONVERGED) {
        trainedVersion = version;
        localPhase = 'trained';
        publish();
        setPhase('trained');
        return;
      }
      if (step % PUBLISH_EVERY === 0) publish();
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [animate, seed, mode]);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setMeasured({});
    setSolver(null);
    setSeed((n) => n + 1);
  };
  const retrain = () => {
    setSeed((n) => n + 1);
    if (mode === 'viscous') {
      setMeasured({});
      setResetToken((t) => t + 1);
    }
  };

  const current: NetSnapshot | null = still ?? snapshot;
  const currentPhase: Phase = still ? 'trained' : phase;
  const samples = still ? idealSet.length : sampleCount;
  const clIdeal = liftCoefficient(af, rad(alphaDeg));
  const measuredHere = measured[String(alphaDeg)];
  const clTrue: number | null = viscous ? (measuredHere ?? (solver && solver.alphaDeg === alphaDeg && !solver.diverged ? solver.cl : null)) : clIdeal;
  const clModel = current ? forward(current.net, normaliseAlpha(alphaDeg)).y : 0;
  const error = clTrue == null ? null : Math.abs(clModel - clTrue);
  const nearStall = alphaDeg >= 13;
  const measuredCount = measuredList.length;

  const angleSlider = (
    <div className="text-sm text-slate-600 dark:text-slate-300">
      <div className="flex justify-between">
        <label htmlFor={sliderId}>Angle of attack</label>
        <span className="tabular-nums font-medium text-slate-800 dark:text-slate-100">{fmtAlpha(alphaDeg)}</span>
      </div>
      <input id={sliderId} type="range" min={ALPHA_MIN} max={ALPHA_MAX} step={0.5} value={alphaDeg} onChange={(e) => setAlphaDeg(Number(e.target.value))} className="mt-1 w-full accent-[var(--arc-ai)]" />
    </div>
  );

  const emitEveryMs = phase === 'sampling' ? 90 : phase === 'learning' ? 420 : 0;
  const numberBox = 'w-16 rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-right text-xs tabular-nums text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/20 dark:bg-black/30 dark:text-white';

  const status = (() => {
    if (currentPhase === 'trained') {
      return viscous ? (
        <>
          <span className="font-semibold">Model fits {measuredCount} measured angles ✓</span> — hold a new angle to add one.
        </>
      ) : (
        <>
          <span className="font-semibold">Model trained ✓</span> — the surrogate now estimates lift instantly.
        </>
      );
    }
    if (currentPhase === 'learning') return viscous ? `Learning from ${measuredCount} measured angles…` : 'Learning by gradient descent…';
    if (viscous) return `Hold an angle for a moment to measure its lift — ${measuredCount} of ${MIN_MEASURED} to start learning.`;
    return 'Reading samples from the physics…';
  })();

  return (
    <div className={`flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/40 p-4 dark:border-white/10 dark:bg-white/[0.02] ${compact ? '' : 'md:p-4'}`}>
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">Live aerospace × AI experiment</p>
          <h2 className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-white">Teach a neural network to predict lift</h2>
          <p id={hintId} className="mt-0.5 text-sm leading-snug text-slate-600 dark:text-slate-300">
            {animate && !compact ? 'Drag the airfoil to change its angle.' : 'Slide to change the airfoil’s angle.'}{' '}
            {viscous
              ? 'A viscous-flow solver measures the lift at each angle you hold, and a small neural network learns from those measurements.'
              : 'An ideal-flow model works out the lift, and a small neural network learns it live in your browser.'}
          </p>
        </div>
        {animate && (
          <div role="group" aria-label="Physics" className="flex shrink-0 rounded-lg border border-slate-300 p-0.5 text-xs font-medium dark:border-white/20">
            {(['ideal', 'viscous'] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => switchMode(m)}
                className={`rounded-md px-2.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  mode === m ? 'bg-primary/15 text-primary' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                {m === 'ideal' ? 'Ideal flow' : 'Viscous flow'}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className={`relative ${compact ? 'h-[210px]' : 'h-[220px]'}`}>
        {viscous ? (
          <ViscousCanvas
            alphaDeg={alphaDeg}
            onAlphaChange={setAlphaDeg}
            reynolds={reynolds}
            les={les}
            isDark={isDark}
            draggable={!compact}
            running
            onFrame={onFrame}
            onUnavailable={onWorkerUnavailable}
            resetToken={resetToken}
            ariaDescribedBy={hintId}
            className={`absolute inset-y-0 left-0 ${compact ? 'right-0' : 'right-[172px]'}`}
          />
        ) : animate ? (
          <FlowCanvas
            af={af}
            alphaDeg={alphaDeg}
            onAlphaChange={setAlphaDeg}
            isDark={isDark}
            emitEveryMs={emitEveryMs}
            draggable={!compact}
            onUnavailable={onUnavailable}
            ariaDescribedBy={hintId}
            className={`absolute inset-y-0 left-0 ${compact ? 'right-0' : 'right-[172px]'}`}
          />
        ) : (
          <FlowFieldStatic alphaDeg={alphaDeg} className={`absolute inset-y-0 left-0 !min-h-0 ${compact ? 'right-0' : 'right-[172px]'}`} />
        )}
        {!compact && current && (
          <div className="pointer-events-none absolute right-0 top-1/2 w-[172px] -translate-y-1/2">
            <SurrogateNet snapshot={current} alphaDeg={alphaDeg} phase={currentPhase} />
          </div>
        )}
      </div>

      {mode === 'viscous' && workerUnavailable && (
        <p className="text-xs text-amber-700 dark:text-amber-400">This browser cannot run the solver in a background thread; showing ideal flow.</p>
      )}
      {viscous && (solver?.restarts ?? 0) > 0 && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          The solver went unstable at this setting and restarted the flow ({solver?.restarts}×). Lower the Reynolds number or turn on the turbulence model.
        </p>
      )}

      {(compact || !animate) && angleSlider}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white/70 px-4 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Physics <span className="font-normal normal-case tracking-normal">· {viscous ? 'lattice-Boltzmann' : 'ideal flow'}</span>
          </p>
          <p className="mt-0.5 text-slate-900 dark:text-white">
            <span className="text-sm font-medium">{compact ? 'Cₗ' : 'Lift coefficient'}</span>{' '}
            <span className="text-lg font-bold tabular-nums">{clTrue == null ? '—' : clTrue.toFixed(2)}</span>
            {viscous && solver && !solver.diverged && (
              <span className="ml-2 text-sm text-slate-600 dark:text-slate-300">
                <span className="font-medium">{compact ? 'C𝑑' : 'drag'}</span> <span className="tabular-nums">{solver.cd.toFixed(2)}</span>
              </span>
            )}
          </p>
          {viscous ? (
            <div className="mt-1 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor={angleId}>Angle</label>
                <span className="inline-flex items-center gap-1">
                  <input id={angleId} type="number" min={ALPHA_MIN} max={ALPHA_MAX} step={0.5} value={alphaDeg} onChange={(e) => Number.isFinite(Number(e.target.value)) && setAlphaDeg(clampAlpha(Number(e.target.value)))} className={numberBox} />
                  °
                </span>
              </div>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor={reId}>Reynolds number</label>
                  <input
                    id={`${reId}-n`}
                    aria-label="Reynolds number, typed"
                    type="number"
                    min={RE_MIN}
                    max={RE_MAX}
                    step={10}
                    value={reynolds}
                    onChange={(e) => Number.isFinite(Number(e.target.value)) && setReynolds(Math.min(RE_MAX, Math.max(RE_MIN, Math.round(Number(e.target.value)))))}
                    className={numberBox}
                  />
                </div>
                <input id={reId} type="range" min={0} max={1000} step={1} value={reToLog(reynolds)} onChange={(e) => setReynolds(logToRe(Number(e.target.value)))} className="mt-1 w-full accent-[var(--arc-ai)]" />
              </div>
              <label htmlFor={lesId} className="flex items-center gap-2 text-xs">
                <input id={lesId} type="checkbox" checked={les} onChange={(e) => setLes(e.target.checked)} className="h-3.5 w-3.5 accent-[var(--arc-ai)]" />
                Turbulence model (Smagorinsky)
              </label>
            </div>
          ) : (
            <>
              <p className="text-sm tabular-nums text-slate-600 dark:text-slate-300">Angle {fmtAlpha(alphaDeg)}</p>
              {nearStall && !compact && (
                <p className="mt-1 text-xs leading-snug text-amber-700 dark:text-amber-400">
                  A real wing would be near stall here; the ideal model keeps climbing.
                </p>
              )}
            </>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white/70 px-4 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            AI prediction <span className="font-normal normal-case tracking-normal">· surrogate</span>
          </p>
          <p className="mt-0.5 text-slate-900 dark:text-white">
            <span className="text-sm font-medium">{compact ? 'Predicted Cₗ' : 'Predicted coefficient'}</span>{' '}
            <span className="text-lg font-bold tabular-nums">{current ? clModel.toFixed(2) : '—'}</span>
          </p>
          <p className="text-sm tabular-nums text-slate-600 dark:text-slate-300">Error {error == null ? '—' : error.toFixed(2)}</p>
          {viscous && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Trained on {measuredCount} measured angle{measuredCount === 1 ? '' : 's'}
              {nearStall && measuredHere !== undefined && measuredHere < clIdeal * 0.7 ? ' · the wing has stalled: the ideal model says ' + clIdeal.toFixed(2) : ''}
            </p>
          )}
        </div>
      </div>

      {!compact && current && (
        <LiftChart
          af={af}
          net={current.net}
          alphaDeg={alphaDeg}
          sampleCount={samples}
          totalSamples={idealSet.length}
          trained={currentPhase === 'trained'}
          measured={viscous ? measuredList : undefined}
          truthNow={viscous ? clTrue : undefined}
        />
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-700 dark:text-slate-200" aria-live="polite">
          {status}
        </p>
        <button
          type="button"
          onClick={retrain}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/20 dark:text-slate-200"
        >
          <RotateCcw size={14} aria-hidden="true" />
          {currentPhase === 'trained' ? 'Retrain' : 'Restart'}
        </button>
      </div>

      {!compact && (
        <details className="text-xs text-slate-600 dark:text-slate-300">
          <summary className="cursor-pointer select-none rounded font-medium hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:text-white">
            {viscous ? 'What is the viscous solver, and what is it not?' : 'Why a neural network for something this simple?'}
          </summary>
          {viscous ? (
            <p className="mt-1 leading-snug">
              A 2D lattice-Boltzmann solver (D2Q9, {les ? 'with a Smagorinsky large-eddy model' : 'plain BGK'}) on a {'256×104'} grid, in a Web Worker.
              It has viscosity, so the boundary layer can separate and the wake can shed vortices — things ideal flow cannot show. It is
              coarse, two-dimensional and not the CFD study’s results; treat the numbers as a picture of the mechanism.
            </p>
          ) : (
            <p className="mt-1 leading-snug">
              The relationship is intentionally simple enough to train live in a browser. Aerospace surrogate models use the same idea to
              stand in for simulations that take hours. Switch to viscous flow above to make the network learn from a real solver instead.
            </p>
          )}
        </details>
      )}
    </div>
  );
};

export default FlowField;
