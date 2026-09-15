import React from 'react';
import { forward, normaliseAlpha, type Net } from '../utils/surrogate';

/**
 * SurrogateNet — the network in the hero, drawn as what it is, in its own
 * glass panel so it reads as the second half of the picture rather than an
 * overlay on the flow.
 *
 * One input (angle), six tanh units, one output (lift). Every edge is a
 * weight, thicker for larger; every hidden node lights with its activation
 * for the angle the visitor has chosen, so pitching the airfoil visibly
 * changes what the network computes. The only text is the step and loss;
 * the phase and the numbers live in the cards and status row beside it, so
 * nothing is said twice.
 */

export type Phase = 'sampling' | 'learning' | 'trained';

export interface NetSnapshot {
  net: Net;
  loss: number;
  step: number;
}

interface Props {
  snapshot: NetSnapshot;
  alphaDeg: number;
  phase: Phase;
}

const W = 170;
const H = 176;
const X_IN = 24;
const X_HID = 85;
const X_OUT = 146;

const SurrogateNet = ({ snapshot, alphaDeg, phase }: Props) => {
  const { net, loss, step } = snapshot;
  const { h } = forward(net, normaliseAlpha(alphaDeg));
  const hy = (j: number) => 18 + (j * (H - 56)) / (net.hidden - 1);
  const stroke = (w: number) => Math.min(3.2, 0.5 + Math.abs(w) * 1.1);
  const edgeOpacity = (w: number) => 0.2 + Math.min(0.6, Math.abs(w) * 0.25);

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/85 p-3 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-[#0b0a1a]/80">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Neural network</p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Neural network with ${net.hidden} hidden units mapping angle of attack to lift coefficient`}
        className={`mt-1 w-full text-primary motion-reduce:animate-none ${phase === 'trained' ? 'net-pulse' : ''}`}
      >
        <g stroke="currentColor" strokeLinecap="round">
          {net.w1.map((w, j) => (
            <line key={`i${j}`} x1={X_IN} y1={H / 2 - 14} x2={X_HID} y2={hy(j)} strokeWidth={stroke(w)} strokeOpacity={edgeOpacity(w)} />
          ))}
          {net.w2.map((w, j) => (
            <line key={`o${j}`} x1={X_HID} y1={hy(j)} x2={X_OUT} y2={H / 2 - 14} strokeWidth={stroke(w)} strokeOpacity={edgeOpacity(w)} />
          ))}
        </g>
        {h.map((a, j) => (
          <g key={j}>
            <circle cx={X_HID} cy={hy(j)} r="7" fill="currentColor" fillOpacity={0.12 + 0.88 * Math.abs(a)} />
            <circle cx={X_HID} cy={hy(j)} r="7" fill="none" stroke="currentColor" strokeOpacity="0.55" />
          </g>
        ))}
        <circle cx={X_IN} cy={H / 2 - 14} r="11" fill="currentColor" fillOpacity="0.95" />
        <circle cx={X_OUT} cy={H / 2 - 14} r="11" fill="currentColor" fillOpacity={phase === 'trained' ? 0.95 : 0.45} />
        <g textAnchor="middle" fontSize="12" fontWeight="600" className="fill-slate-700 dark:fill-slate-200">
          <text x={X_IN} y={H - 22}>Angle</text>
          <text x={X_OUT} y={H - 22}>Lift</text>
        </g>
        <g textAnchor="middle" fontSize="10" className="fill-slate-500 dark:fill-slate-400">
          <text x={X_IN} y={H - 8}>α</text>
          <text x={X_OUT} y={H - 8}>cl</text>
        </g>
      </svg>
      <p className="mt-1 text-xs tabular-nums text-slate-500 dark:text-slate-400">
        {phase === 'trained' ? `${step.toLocaleString()} steps` : `step ${step.toLocaleString()} · training loss ${loss >= 0.01 ? loss.toFixed(3) : loss.toExponential(1).replace('e-', 'e−')}`}
      </p>
    </div>
  );
};

export default SurrogateNet;
