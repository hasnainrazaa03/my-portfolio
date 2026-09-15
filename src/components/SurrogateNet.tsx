import React from 'react';
import { forward, normaliseAlpha, type Net } from '../utils/surrogate';

/**
 * SurrogateNet — the network in the hero picture, drawn as what it is.
 *
 * One input (α), six tanh units, one output (cl). Every edge is a weight:
 * thicker means larger. Every hidden node lights with its activation for the
 * angle the visitor has chosen, so pitching the airfoil visibly changes what
 * the network computes. The numbers underneath are the honest ones: what the
 * model predicts, what the physics says, and how far training has got.
 *
 * Nothing animates here on its own; FlowField trains the model in its loop
 * and hands over a snapshot a few times a second.
 */

export interface NetSnapshot {
  net: Net;
  loss: number;
  step: number;
  converged: boolean;
}

interface Props {
  snapshot: NetSnapshot;
  alphaDeg: number;
  /** cl from the physics at the same angle. */
  truth: number;
  onRetrain: () => void;
}

const W = 150;
const H = 190;
const X_IN = 16;
const X_HID = 76;
const X_OUT = 134;

const fmtLoss = (l: number) => (l >= 0.01 ? l.toFixed(3) : l.toExponential(1).replace('e-', 'e−'));

const SurrogateNet = ({ snapshot, alphaDeg, truth, onRetrain }: Props) => {
  const { net, loss, step, converged } = snapshot;
  const { h, y: pred } = forward(net, normaliseAlpha(alphaDeg));
  const hy = (j: number) => 18 + (j * (H - 36)) / (net.hidden - 1);
  const stroke = (w: number) => Math.min(3, 0.4 + Math.abs(w) * 1.1);

  return (
    <div className="flex w-[168px] flex-col items-stretch gap-1.5">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        role="img"
        aria-label={`Neural network with ${net.hidden} hidden units mapping angle of attack to lift coefficient`}
        className="mx-auto text-primary"
      >
        <g stroke="currentColor" strokeLinecap="round">
          {net.w1.map((w, j) => (
            <line key={`i${j}`} x1={X_IN} y1={H / 2} x2={X_HID} y2={hy(j)} strokeWidth={stroke(w)} strokeOpacity={0.18 + Math.min(0.6, Math.abs(w) * 0.25)} />
          ))}
          {net.w2.map((w, j) => (
            <line key={`o${j}`} x1={X_HID} y1={hy(j)} x2={X_OUT} y2={H / 2} strokeWidth={stroke(w)} strokeOpacity={0.18 + Math.min(0.6, Math.abs(w) * 0.25)} />
          ))}
        </g>
        <circle cx={X_IN} cy={H / 2} r="7" fill="currentColor" fillOpacity="0.9" />
        <text x={X_IN} y={H / 2 + 20} textAnchor="middle" fontSize="10" fill="currentColor" className="font-mono">α</text>
        {h.map((a, j) => (
          <g key={j}>
            <circle cx={X_HID} cy={hy(j)} r="6.5" fill="currentColor" fillOpacity={0.12 + 0.88 * Math.abs(a)} />
            <circle cx={X_HID} cy={hy(j)} r="6.5" fill="none" stroke="currentColor" strokeOpacity="0.5" />
          </g>
        ))}
        <circle cx={X_OUT} cy={H / 2} r="7" fill="currentColor" fillOpacity={converged ? 0.95 : 0.55} />
        <text x={X_OUT} y={H / 2 + 20} textAnchor="middle" fontSize="10" fill="currentColor" className="font-mono">cl</text>
      </svg>

      <div className="rounded-md bg-white/70 px-2.5 py-1.5 font-mono text-[11px] leading-snug text-slate-700 backdrop-blur dark:bg-black/40 dark:text-slate-200">
        <p className="font-semibold">Surrogate model</p>
        <p>
          ĉl <span className="tabular-nums">{pred.toFixed(2)}</span> · truth <span className="tabular-nums">{truth.toFixed(2)}</span>
        </p>
        <p className="text-slate-500 dark:text-slate-400">
          {converged ? 'converged' : `loss ${fmtLoss(loss)}`} · step <span className="tabular-nums">{step.toLocaleString()}</span>
        </p>
        <p className="mt-1 font-sans text-[10px] leading-tight text-slate-500 dark:text-slate-400">
          Learns α → cl from the physics by gradient descent, in your browser.
        </p>
      </div>
      <div className="flex justify-end px-1 text-[10px]">
        <button
          type="button"
          onClick={onRetrain}
          className="pointer-events-auto rounded px-1.5 py-0.5 font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Retrain
        </button>
      </div>
    </div>
  );
};

export default SurrogateNet;
