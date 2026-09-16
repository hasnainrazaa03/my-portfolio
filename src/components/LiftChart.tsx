import React, { useMemo } from 'react';
import { liftCoefficient, type Airfoil } from '../utils/potentialFlow';
import { forward, normaliseAlpha, type Net } from '../utils/surrogate';
import { ALPHA_MAX, ALPHA_MIN, rad } from '../utils/flowScene';

/**
 * LiftChart — lift against angle: what the physics says and what the model
 * currently predicts. During training the violet line moves onto the
 * physics, which says "learning" faster than any number can.
 *
 * Ideal mode: the physics is a line (the closed form) and the samples appear
 * as dots along it. Viscous mode: the physics is only known where the
 * solver has measured it, so those points are the dots, the ideal line stays
 * as a faint reference (the gap past 12° is the stall the ideal model cannot
 * see), and the model is fitted to the dots.
 */

export interface Measured {
  alphaDeg: number;
  cl: number;
}

interface Props {
  af: Airfoil;
  net: Net;
  alphaDeg: number;
  sampleCount: number;
  totalSamples: number;
  trained: boolean;
  /** Present in viscous mode: the solver's measurements. */
  measured?: Measured[];
  /** The physics' value at the current angle (live), when it is not the closed form. */
  truthNow?: number | null;
}

const W = 560;
const H = 72;
const M = { left: 8, right: 8, top: 6, bottom: 16 };
const CL_MIN = -0.5;
const CL_MAX = 2.6;
const POINTS = 48;
const clamp = (cl: number) => Math.min(CL_MAX, Math.max(CL_MIN, cl));

const LiftChart = ({ af, net, alphaDeg, sampleCount, totalSamples, trained, measured, truthNow }: Props) => {
  const sx = (deg: number) => M.left + ((deg - ALPHA_MIN) / (ALPHA_MAX - ALPHA_MIN)) * (W - M.left - M.right);
  const sy = (cl: number) => M.top + (1 - (cl - CL_MIN) / (CL_MAX - CL_MIN)) * (H - M.top - M.bottom);
  const degs = useMemo(() => Array.from({ length: POINTS }, (_, i) => ALPHA_MIN + (i / (POINTS - 1)) * (ALPHA_MAX - ALPHA_MIN)), []);
  const ideal = useMemo(() => degs.map((d) => liftCoefficient(af, rad(d))), [af, degs]);
  const model = degs.map((d) => forward(net, normaliseAlpha(d)).y);
  const pts = (ys: number[]) => degs.map((d, i) => `${sx(d).toFixed(1)},${sy(clamp(ys[i])).toFixed(1)}`).join(' ');
  const viscous = measured !== undefined;
  const clModel = forward(net, normaliseAlpha(alphaDeg)).y;
  const clTrue = viscous ? truthNow : liftCoefficient(af, rad(alphaDeg));
  const shown = Math.round((sampleCount / totalSamples) * POINTS);

  return (
    <figure className="rounded-xl border border-slate-200 bg-white/70 px-3 pt-2 pb-0.5 dark:border-white/10 dark:bg-white/[0.03]">
      <figcaption className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
        <span className="font-semibold">
          Lift coefficient against angle
          {trained && <span className="ml-2 font-normal text-primary">· prediction matches {viscous ? 'the measurements' : 'physics'}</span>}
        </span>
        <span className="flex items-center gap-3">
          {viscous ? (
            <>
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full" style={{ background: 'var(--arc-ai)' }} />
                measured
              </span>
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <span aria-hidden="true" className="inline-block h-0.5 w-4 rounded bg-slate-400 dark:bg-slate-500" />
                ideal
              </span>
            </>
          ) : (
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block h-0.5 w-4 rounded" style={{ background: 'var(--arc-ai)' }} />
              physics
            </span>
          )}
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
        aria-label={`Lift coefficient against angle of attack: ${viscous ? 'the solver measures' : 'the physics gives'} ${clTrue == null ? 'nothing yet' : clTrue.toFixed(2)} at ${alphaDeg} degrees, the model predicts ${clModel.toFixed(2)}`}
      >
        <line x1={M.left} x2={W - M.right} y1={sy(0)} y2={sy(0)} stroke="currentColor" strokeOpacity="0.3" />
        <g fontSize="10" fill="currentColor">
          <text x={M.left} y={H - 4}>−6°</text>
          <text x={sx(5)} y={H - 4} textAnchor="middle">5°</text>
          <text x={W - M.right} y={H - 4} textAnchor="end">16°</text>
        </g>
        {viscous ? (
          <polyline points={pts(ideal)} fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.5" strokeDasharray="2 4" strokeLinejoin="round" />
        ) : (
          <polyline points={pts(ideal)} fill="none" stroke="var(--arc-ai)" strokeWidth="2" strokeLinejoin="round" />
        )}
        <polyline points={pts(model)} fill="none" stroke="var(--viz-model)" strokeWidth="2" strokeLinejoin="round" strokeDasharray="6 4" />
        <line x1={sx(alphaDeg)} x2={sx(alphaDeg)} y1={sy(clamp(Math.max(clTrue ?? clModel, clModel)))} y2={H - M.bottom + 2} stroke="currentColor" strokeOpacity="0.45" strokeDasharray="2 3" />
        {viscous
          ? measured.map((m) => <circle key={m.alphaDeg} cx={sx(m.alphaDeg)} cy={sy(clamp(m.cl))} r="3" fill="var(--arc-ai)" className="stroke-white dark:stroke-[#0f0d1f]" strokeWidth="1" />)
          : degs.slice(0, shown).map((d, i) => <circle key={d} cx={sx(d)} cy={sy(ideal[i])} r="1.8" fill="var(--arc-ai)" fillOpacity="0.9" />)}
        <circle cx={sx(alphaDeg)} cy={sy(clamp(clModel))} r="4.5" fill="var(--viz-model)" className="stroke-white dark:stroke-[#0f0d1f]" strokeWidth="1.5" />
        {clTrue != null && <circle cx={sx(alphaDeg)} cy={sy(clamp(clTrue))} r="4.5" fill="var(--arc-ai)" className="stroke-white dark:stroke-[#0f0d1f]" strokeWidth="1.5" />}
      </svg>
    </figure>
  );
};

export default LiftChart;
