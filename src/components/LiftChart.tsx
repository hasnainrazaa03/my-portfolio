import React, { useMemo } from 'react';
import { liftCoefficient, type Airfoil } from '../utils/potentialFlow';
import { forward, normaliseAlpha, type Net } from '../utils/surrogate';
import { ALPHA_MAX, ALPHA_MIN, rad } from '../utils/flowScene';

/**
 * LiftChart — lift against angle, two lines: what the physics says and what
 * the model currently predicts. During training the violet line moves onto
 * the teal one, which says "learning" faster than any number can. Two
 * markers sit at the visitor's angle; once trained they coincide.
 *
 * Two series, so a legend (in the header row, in text colour with swatches)
 * and no value labels: the metric cards beside the chart carry the numbers.
 * The model's line is dashed so that, once the two coincide, both remain
 * visible instead of one hiding the other.
 */

interface Props {
  af: Airfoil;
  net: Net;
  alphaDeg: number;
  /** How many of the training samples to show as dots (grows during sampling). */
  sampleCount: number;
  totalSamples: number;
  trained: boolean;
}

const W = 560;
const H = 72;
const M = { left: 8, right: 8, top: 6, bottom: 16 };
const CL_MIN = -0.5;
const CL_MAX = 2.6;
const POINTS = 48;

const LiftChart = ({ af, net, alphaDeg, sampleCount, totalSamples, trained }: Props) => {
  const sx = (deg: number) => M.left + ((deg - ALPHA_MIN) / (ALPHA_MAX - ALPHA_MIN)) * (W - M.left - M.right);
  const sy = (cl: number) => M.top + (1 - (cl - CL_MIN) / (CL_MAX - CL_MIN)) * (H - M.top - M.bottom);
  const degs = useMemo(() => Array.from({ length: POINTS }, (_, i) => ALPHA_MIN + (i / (POINTS - 1)) * (ALPHA_MAX - ALPHA_MIN)), []);
  const truth = useMemo(() => degs.map((d) => liftCoefficient(af, rad(d))), [af, degs]);
  const model = degs.map((d) => forward(net, normaliseAlpha(d)).y);
  const pts = (ys: number[]) => degs.map((d, i) => `${sx(d).toFixed(1)},${sy(Math.min(CL_MAX, Math.max(CL_MIN, ys[i]))).toFixed(1)}`).join(' ');
  const clTrue = liftCoefficient(af, rad(alphaDeg));
  const clModel = forward(net, normaliseAlpha(alphaDeg)).y;
  const shown = Math.round((sampleCount / totalSamples) * POINTS);

  return (
    <figure className="rounded-xl border border-slate-200 bg-white/70 px-3 pt-2 pb-0.5 dark:border-white/10 dark:bg-white/[0.03]">
      <figcaption className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
        <span className="font-semibold">
          Lift coefficient against angle
          {trained && <span className="ml-2 font-normal text-primary">· prediction matches physics</span>}
        </span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-0.5 w-4 rounded" style={{ background: 'var(--arc-ai)' }} />
            physics
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-0.5 w-4 rounded" style={{ background: 'repeating-linear-gradient(90deg, var(--viz-model) 0 4px, transparent 4px 7px)' }} />
            model
          </span>
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-1 block h-auto w-full text-slate-500 dark:text-slate-400"
        role="img"
        aria-label={`Lift coefficient against angle of attack: the physics gives ${clTrue.toFixed(2)} at ${alphaDeg} degrees, the model predicts ${clModel.toFixed(2)}`}
      >
        <line x1={M.left} x2={W - M.right} y1={sy(0)} y2={sy(0)} stroke="currentColor" strokeOpacity="0.3" />
        <g fontSize="10" fill="currentColor">
          <text x={M.left} y={H - 4}>−6°</text>
          <text x={sx(5)} y={H - 4} textAnchor="middle">5°</text>
          <text x={W - M.right} y={H - 4} textAnchor="end">16°</text>
        </g>
        <polyline points={pts(truth)} fill="none" stroke="var(--arc-ai)" strokeWidth="2" strokeLinejoin="round" />
        <polyline points={pts(model)} fill="none" stroke="var(--viz-model)" strokeWidth="2" strokeLinejoin="round" strokeDasharray="6 4" />
        {/* The chosen angle, tied to its axis value. */}
        <line x1={sx(alphaDeg)} x2={sx(alphaDeg)} y1={sy(Math.max(clTrue, clModel))} y2={H - M.bottom + 2} stroke="currentColor" strokeOpacity="0.45" strokeDasharray="2 3" />
        {degs.slice(0, shown).map((d, i) => (
          <circle key={d} cx={sx(d)} cy={sy(truth[i])} r="1.8" fill="var(--arc-ai)" fillOpacity="0.9" />
        ))}
        <circle cx={sx(alphaDeg)} cy={sy(Math.min(CL_MAX, Math.max(CL_MIN, clModel)))} r="4.5" fill="var(--viz-model)" className="stroke-white dark:stroke-[#0f0d1f]" strokeWidth="1.5" />
        <circle cx={sx(alphaDeg)} cy={sy(clTrue)} r="4.5" fill="var(--arc-ai)" className="stroke-white dark:stroke-[#0f0d1f]" strokeWidth="1.5" />
      </svg>
    </figure>
  );
};

export default LiftChart;
