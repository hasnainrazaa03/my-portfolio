import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { joukowski, liftCoefficient } from '../utils/potentialFlow';
import { ALPHA_DEFAULT, ALPHA_MAX, ALPHA_MIN, rad } from '../utils/flowScene';
import { createNet, forward, normaliseAlpha, trainStep, trainingSet, type Net, type Sample } from '../utils/surrogate';
import FlowCanvas from './FlowCanvas';
import FlowFieldStatic from './FlowFieldStatic';
import LiftChart from './LiftChart';
import SurrogateNet, { type NetSnapshot, type Phase } from './SurrogateNet';

/**
 * FlowField — the hero's interactive story: move the airfoil, generate
 * physics, watch a neural network learn.
 *
 * Left of the picture, ideal flow around an airfoil the visitor drags to
 * pitch (potentialFlow.ts, labelled an ideal-flow model, not CFD). Right of
 * it, a six-unit network that learns α → cl from that physics by gradient
 * descent, live in the browser (surrogate.ts). Under both, the two answers
 * side by side, a lift-against-angle chart where the model's line moves
 * onto the physics', and a status line that goes from reading the physics,
 * to learning, to trained.
 *
 * Training runs in three phases so it can be followed without reading:
 *   sampling  ~1.4 s: sample points appear on the chart and leave the
 *             trailing edge for the network; no steps yet
 *   learning  one gradient step per frame, about ten seconds at 60 Hz
 *   trained   loss under the threshold; training stops, the network pulses
 *
 * Modes. `compact` (phones) keeps the airfoil, a range input to pitch it and
 * the two answers, and drops the diagram and chart. With `motion` off
 * (Save-Data) or under prefers-reduced-motion, or when no 2D context can be
 * had, the still SVG stands in for the canvas and the model is trained
 * synchronously so the visitor sees the finished state, with the range input
 * to pitch the airfoil.
 */

interface Props {
  motion?: boolean;
  compact?: boolean;
}

const CONVERGED = 1e-4;
const SAMPLING_MS = 1400;
const PUBLISH_EVERY = 6;
const cloneNet = (n: Net): Net => ({ ...n, w1: [...n.w1], b1: [...n.b1], w2: [...n.w2], vw1: [...n.vw1], vb1: [...n.vb1], vw2: [...n.vw2] });

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

const FlowField = ({ motion = true, compact = false }: Props) => {
  const { isDark } = useTheme();
  const af = useMemo(() => joukowski(), []);
  const set = useMemo(() => trainingSet((deg) => liftCoefficient(af, rad(deg))), [af]);
  const [alphaDeg, setAlphaDeg] = useState(ALPHA_DEFAULT);
  const [seed, setSeed] = useState(1);
  const [canvasUnavailable, setCanvasUnavailable] = useState(false);
  const [phase, setPhase] = useState<Phase>('sampling');
  const [sampleCount, setSampleCount] = useState(0);
  const [snapshot, setSnapshot] = useState<NetSnapshot | null>(null);
  const hintId = useId();
  const sliderId = useId();

  const reducedMotion = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const animate = motion && !reducedMotion && !canvasUnavailable;
  const onUnavailable = useCallback(() => setCanvasUnavailable(true), []);

  // Still modes: trained now, shown finished.
  const still = useMemo(() => (animate ? null : trainToConvergence(seed, set)), [animate, seed, set]);

  // Live training.
  useEffect(() => {
    if (!animate) return;
    const net = createNet(seed);
    let step = 0;
    let loss = Infinity;
    let rafId = 0;
    let started = 0;
    setPhase('sampling');
    setSampleCount(0);
    setSnapshot({ net: cloneNet(net), loss, step });

    const tick = (now: number) => {
      if (!started) started = now;
      if (document.hidden) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      const elapsed = now - started;
      if (elapsed < SAMPLING_MS) {
        setSampleCount(Math.floor((elapsed / SAMPLING_MS) * set.length));
        rafId = requestAnimationFrame(tick);
        return;
      }
      if (step === 0) {
        setSampleCount(set.length);
        setPhase('learning');
      }
      loss = trainStep(net, set);
      step += 1;
      if (loss <= CONVERGED) {
        setSnapshot({ net: cloneNet(net), loss, step });
        setPhase('trained');
        return;
      }
      if (step % PUBLISH_EVERY === 0) setSnapshot({ net: cloneNet(net), loss, step });
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [animate, seed, set]);

  const current: NetSnapshot | null = still ?? snapshot;
  const currentPhase: Phase = still ? 'trained' : phase;
  const samples = still ? set.length : sampleCount;
  const clTrue = liftCoefficient(af, rad(alphaDeg));
  const clModel = current ? forward(current.net, normaliseAlpha(alphaDeg)).y : 0;
  const error = Math.abs(clModel - clTrue);
  const nearStall = alphaDeg >= 13;

  const slider = (
    <div className="text-sm text-slate-600 dark:text-slate-300">
      <div className="flex justify-between">
        <label htmlFor={sliderId}>Angle of attack</label>
        <span className="tabular-nums font-medium text-slate-800 dark:text-slate-100">{fmtAlpha(alphaDeg)}</span>
      </div>
      <input
        id={sliderId}
        type="range"
        min={ALPHA_MIN}
        max={ALPHA_MAX}
        step={0.5}
        value={alphaDeg}
        onChange={(e) => setAlphaDeg(Number(e.target.value))}
        className="mt-1 w-full accent-[var(--arc-ai)]"
      />
    </div>
  );

  // Sample points leaving the trailing edge: dense while sampling, a trickle
  // while learning, none once trained.
  const emitEveryMs = phase === 'sampling' ? 90 : phase === 'learning' ? 420 : 0;

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/40 p-4 dark:border-white/10 dark:bg-white/[0.02] ${compact ? '' : 'md:p-4'}`}
    >
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">Live aerospace × AI experiment</p>
        <h2 className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-white">Teach a neural network to predict lift</h2>
        <p id={hintId} className="mt-0.5 text-sm leading-snug text-slate-600 dark:text-slate-300">
          {animate && !compact ? 'Drag the airfoil to change its angle.' : 'Slide to change the airfoil’s angle.'} An ideal-flow model works out the lift, and a
          small neural network learns it live in your browser.
        </p>
      </header>

      {/* The picture ends where the network panel begins, so the panel reads
          as the second stage rather than a badge over the flow. */}
      <div className={`relative ${compact ? 'h-[210px]' : 'h-[220px]'}`}>
        {animate ? (
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

      {(compact || !animate) && slider}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white/70 px-4 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Physics <span className="font-normal normal-case tracking-normal">· ideal flow</span>
          </p>
          <p className="mt-0.5 text-slate-900 dark:text-white">
            <span className="text-sm font-medium">{compact ? 'Cₗ' : 'Lift coefficient'}</span>{' '}
            <span className="text-lg font-bold tabular-nums">{clTrue.toFixed(2)}</span>
          </p>
          <p className="text-sm tabular-nums text-slate-600 dark:text-slate-300">Angle {fmtAlpha(alphaDeg)}</p>
          {nearStall && !compact && (
            <p className="mt-1 text-xs leading-snug text-amber-700 dark:text-amber-400">
              A real wing would be near stall here; the ideal model keeps climbing.
            </p>
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
          <p className="text-sm tabular-nums text-slate-600 dark:text-slate-300">Error {current ? error.toFixed(2) : '—'}</p>
        </div>
      </div>

      {!compact && current && (
        <LiftChart af={af} net={current.net} alphaDeg={alphaDeg} sampleCount={samples} totalSamples={set.length} trained={currentPhase === 'trained'} />
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-700 dark:text-slate-200" aria-live="polite">
          {currentPhase === 'trained' ? (
            <>
              <span className="font-semibold">Model trained ✓</span> — the surrogate now estimates lift instantly.
            </>
          ) : currentPhase === 'learning' ? (
            'Learning by gradient descent…'
          ) : (
            'Reading samples from the physics…'
          )}
        </p>
        <button
          type="button"
          onClick={() => setSeed((n) => n + 1)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/20 dark:text-slate-200"
        >
          <RotateCcw size={14} aria-hidden="true" />
          {currentPhase === 'trained' ? 'Retrain' : 'Restart'}
        </button>
      </div>

      {!compact && (
        <details className="text-xs text-slate-600 dark:text-slate-300">
          <summary className="cursor-pointer select-none rounded font-medium hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:text-white">
            Why a neural network for something this simple?
          </summary>
          <p className="mt-1 leading-snug">
            The relationship is intentionally simple enough to train live in a browser. Aerospace surrogate models use the same
            idea to stand in for simulations that take hours.{' '}
            <a href="/lab/flow" className="font-medium text-primary underline-offset-2 hover:underline">
              See the flow with viscosity, separation and vortices →
            </a>
          </p>
        </details>
      )}
    </div>
  );
};

export default FlowField;
