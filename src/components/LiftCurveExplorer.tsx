import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { liftCoefficient, parseFourDigit, zeroLiftAngleDeg } from '../utils/thinAirfoil';

/**
 * LiftCurveExplorer — lift coefficient against angle of attack for the two
 * sections in the NACA 4412 study, from thin-airfoil theory.
 *
 * The one thing it is built to make obvious is what camber does: the 4412's
 * line is the 0012's line slid left by its zero-lift angle, so at any angle the
 * cambered section lifts more. That is the intuition the CFD study starts from.
 *
 * The one thing it must never do is pass for the study's results. It is
 * labelled as a textbook model in its title, its badge and its notes; the
 * region where real sections stall is shaded and the lines turn dashed there,
 * because the theory keeps climbing straight through it.
 *
 * Two series, so a legend AND direct labels, and the colours are the site's
 * validated arc tokens (checked as a pair on both card surfaces). Values come
 * from a readout driven by the slider or the pointer, and every number is in
 * the table view.
 */

const SECTIONS = [
  { id: '4412', label: 'NACA 4412', note: 'cambered', colour: 'var(--arc-aerospace)', dash: undefined },
  { id: '0012', label: 'NACA 0012', note: 'symmetric', colour: 'var(--arc-software)', dash: '6 4' },
] as const;

const ALPHA_MIN = -8;
const ALPHA_MAX = 16;
/** Beyond here the linear theory is drawn dashed and the region is shaded. */
const STALL_FROM = 12;
const CL_MIN = -1;
const CL_MAX = 2.5;

// Drawing space: a fixed width, so coordinates are stable.
const W = 640;

/**
 * Layout for a given text scale. The SVG scales to its container, so on a
 * phone an 11-unit label would render at about 6px. Instead of shrinking the
 * words with the plot, text and margins grow in drawing units as the figure
 * narrows, keeping labels near 11px on screen; the plot gives up the room.
 * The first version skipped this and was unreadable at 390px.
 */
function layout(k: number) {
  const compact = k > 1.4;
  const H = Math.round(340 + (k - 1) * 150);
  const M = { left: 30 + 18 * k, right: compact ? 52 * k : 104, top: 28 * k, bottom: 44 * k };
  const PW = W - M.left - M.right;
  const PH = H - M.top - M.bottom;
  return {
    H,
    M,
    PW,
    PH,
    compact,
    font: (px: number) => px * k,
    sx: (alpha: number) => M.left + ((alpha - ALPHA_MIN) / (ALPHA_MAX - ALPHA_MIN)) * PW,
    sy: (cl: number) => M.top + (1 - (cl - CL_MIN) / (CL_MAX - CL_MIN)) * PH,
  };
}

/** Rendered width → text scale, from 1 on desktop up to 1.9 on a phone. */
function useTextScale(ref: React.RefObject<Element | null>) {
  const [k, setK] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (width > 0) setK(Math.min(1.9, Math.max(1, W / width)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return k;
}

const X_TICKS = [-8, -4, 0, 4, 8, 12, 16];
const Y_TICKS = [-1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5];
const TABLE_ALPHAS = Array.from({ length: 13 }, (_, i) => ALPHA_MIN + i * 2);

const fmtAlpha = (a: number) => `${a < 0 ? '−' : ''}${Math.abs(a).toFixed(1)}°`;
const fmtCl = (c: number) => `${c < 0 ? '−' : ''}${Math.abs(c).toFixed(2)}`;

const LiftCurveExplorer = () => {
  const [alpha, setAlpha] = useState(5);
  const [showTable, setShowTable] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const k = useTextScale(svgRef);
  const { H, M, PW, PH, compact, font, sx, sy } = useMemo(() => layout(k), [k]);
  const sliderId = useId();
  const readoutId = useId();

  const series = useMemo(
    () => SECTIONS.map((s) => ({ ...s, zeroLift: zeroLiftAngleDeg(parseFourDigit(s.id)) })),
    [],
  );

  /** Pointer x → nearest half degree, so pointer and slider agree exactly. */
  const onPointer = (e: React.PointerEvent<SVGRectElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const box = svg.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * W;
    const a = ALPHA_MIN + ((x - M.left) / PW) * (ALPHA_MAX - ALPHA_MIN);
    setAlpha(Math.min(ALPHA_MAX, Math.max(ALPHA_MIN, Math.round(a * 2) / 2)));
  };

  const cambered = series[0];
  const pastStall = alpha > STALL_FROM;

  return (
    <figure className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f0d1f] p-4 sm:p-7">
      <figcaption className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-bold text-slate-900 dark:text-white">Lift against angle of attack, thin-airfoil theory</p>
          <span className="rounded-full border border-slate-300 dark:border-white/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Textbook model
          </span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Camber slides the whole line left: the 4412 still lifts at small negative angles, where the symmetric 0012
          gives none. These lines come from the classroom idealisation, not from this project's CFD.
        </p>
      </figcaption>

      <ul className="mb-2 flex flex-wrap gap-x-5 gap-y-1 list-none p-0 text-xs text-slate-700 dark:text-slate-300" aria-label="Legend">
        {series.map((s) => (
          <li key={s.id} className="flex items-center gap-2">
            <svg aria-hidden="true" width="24" height="8">
              <line x1="0" y1="4" x2="24" y2="4" stroke={s.colour} strokeWidth="2" strokeDasharray={s.dash} />
            </svg>
            {s.label} <span className="text-slate-500 dark:text-slate-400">({s.note})</span>
          </li>
        ))}
      </ul>

      <div>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full h-auto text-slate-500 dark:text-slate-400 select-none"
          role="img"
          aria-labelledby={readoutId}
          aria-describedby={readoutId}
        >
          {/* Stall region: shaded, labelled, and no longer trusted. */}
          <rect x={sx(STALL_FROM)} y={M.top} width={sx(ALPHA_MAX) - sx(STALL_FROM)} height={PH} className="fill-slate-100 dark:fill-white/[0.07]" />
          {/* Anchored at the plot's right edge so it can run left over the top
              margin: the shaded band alone is too narrow for it on a phone. */}
          <text x={sx(ALPHA_MAX)} y={M.top - font(10)} textAnchor="end" fontSize={font(11)} fill="currentColor">
            Stall region — not modelled
          </text>

          {/* Recessive grid; the zero-lift line a step stronger. */}
          {Y_TICKS.map((t) => (
            <g key={`y${t}`}>
              <line
                x1={M.left}
                x2={M.left + PW}
                y1={sy(t)}
                y2={sy(t)}
                stroke="currentColor"
                strokeOpacity={t === 0 ? 0.55 : 0.15}
              />
              <text x={M.left - font(6)} y={sy(t)} dy="0.32em" textAnchor="end" fontSize={font(11)} fill="currentColor" className="tabular-nums">
                {t < 0 ? `−${Math.abs(t)}` : t}
              </text>
            </g>
          ))}
          {X_TICKS.map((t) => (
            <g key={`x${t}`}>
              <line x1={sx(t)} x2={sx(t)} y1={M.top} y2={M.top + PH} stroke="currentColor" strokeOpacity={t === 0 ? 0.35 : 0.1} />
              <text x={sx(t)} y={M.top + PH + font(16)} textAnchor="middle" fontSize={font(11)} fill="currentColor" className="tabular-nums">
                {t < 0 ? `−${Math.abs(t)}` : t}°
              </text>
            </g>
          ))}
          <text x={M.left + PW / 2} y={H - font(6)} textAnchor="middle" fontSize={font(12)} fill="currentColor">
            Angle of attack α (degrees)
          </text>
          {compact ? (
            // No room for a rotated title beside the ticks on a phone.
            <text x={M.left - font(6)} y={M.top - font(10)} textAnchor="end" fontSize={font(12)} fill="currentColor">
              cl
            </text>
          ) : (
            <text transform={`translate(${font(12)} ${M.top + PH / 2}) rotate(-90)`} textAnchor="middle" fontSize={font(12)} fill="currentColor">
              Lift coefficient cl
            </text>
          )}

          {series.map((s) => {
            const at = (a: number) => `${sx(a)},${sy(liftCoefficient(a, s.zeroLift))}`;
            const end = liftCoefficient(ALPHA_MAX, s.zeroLift);
            return (
              <g key={s.id}>
                <polyline points={`${at(ALPHA_MIN)} ${at(STALL_FROM)}`} fill="none" stroke={s.colour} strokeWidth="2" strokeDasharray={s.dash} />
                <polyline points={`${at(STALL_FROM)} ${at(ALPHA_MAX)}`} fill="none" stroke={s.colour} strokeWidth="2" strokeDasharray="2 4" strokeOpacity="0.7" />
                {/* Direct label at the line's end: identity never rests on colour. */}
                <text x={sx(ALPHA_MAX) + font(6)} y={sy(end)} dy="0.32em" fontSize={font(12)} className="fill-slate-700 dark:fill-slate-200">
                  {compact ? s.id : s.label}
                </text>
              </g>
            );
          })}

          {/* The number camber buys: where the 4412 stops lifting. */}
          <circle cx={sx(cambered.zeroLift)} cy={sy(0)} r={font(4)} fill={cambered.colour} className="stroke-white dark:stroke-[#0f0d1f]" strokeWidth="2" />
          {/* Above the axis and left of the dot: the one region no line crosses. */}
          <text x={sx(cambered.zeroLift) - font(6)} y={sy(0) - font(8)} textAnchor="end" fontSize={font(11)} className="fill-slate-700 dark:fill-slate-200">
            {compact ? '' : 'zero lift at '}{fmtAlpha(cambered.zeroLift)}
          </text>

          {/* Crosshair at the selected angle. */}
          <line x1={sx(alpha)} x2={sx(alpha)} y1={M.top} y2={M.top + PH} stroke="currentColor" strokeOpacity="0.6" strokeDasharray="3 3" />
          {series.map((s) => (
            <circle
              key={s.id}
              cx={sx(alpha)}
              cy={sy(liftCoefficient(alpha, s.zeroLift))}
              r={font(5)}
              fill={s.colour}
              className="stroke-white dark:stroke-[#0f0d1f]"
              strokeWidth="2"
            />
          ))}

          {/* Hit target: the whole plot, larger than any mark. */}
          <rect
            x={M.left}
            y={M.top}
            width={PW}
            height={PH}
            fill="transparent"
            style={{ touchAction: 'pan-y', cursor: 'crosshair' }}
            onPointerMove={onPointer}
            onPointerDown={onPointer}
          />
        </svg>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div>
          <label htmlFor={sliderId} className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Angle of attack
          </label>
          <input
            id={sliderId}
            type="range"
            min={ALPHA_MIN}
            max={ALPHA_MAX}
            step={0.5}
            value={alpha}
            onChange={(e) => setAlpha(Number(e.target.value))}
            aria-valuetext={fmtAlpha(alpha)}
            className="w-full accent-[var(--arc-aerospace)]"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          aria-expanded={showTable}
          className="justify-self-start rounded-md border border-slate-300 dark:border-white/15 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {showTable ? 'Hide table' : 'Show as table'}
        </button>
      </div>

      <p id={readoutId} aria-live="polite" className="mt-3 text-sm text-slate-700 dark:text-slate-200">
        At α = <span className="tabular-nums font-semibold">{fmtAlpha(alpha)}</span>, the model gives{' '}
        {series.map((s, i) => (
          <React.Fragment key={s.id}>
            {i > 0 && ' and '}
            {s.label} cl = <span className="tabular-nums font-semibold">{fmtCl(liftCoefficient(alpha, s.zeroLift))}</span>
          </React.Fragment>
        ))}
        .
        {pastStall && (
          <span className="block mt-1 text-slate-600 dark:text-slate-400">
            A real section is near or past stall here; the model does not know that, so these numbers are too high.
          </span>
        )}
      </p>

      {showTable && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Thin-airfoil lift coefficient by angle of attack</caption>
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th scope="col" className="py-1.5 pr-4 font-semibold">α</th>
                {series.map((s) => (
                  <th key={s.id} scope="col" className="py-1.5 pl-4 text-right font-semibold">
                    {s.label} cl
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TABLE_ALPHAS.map((a) => (
                <tr key={a} className="border-b border-slate-100 dark:border-white/5 text-slate-700 dark:text-slate-200">
                  <td className="py-1.5 pr-4 tabular-nums">
                    {fmtAlpha(a)}
                    {a > STALL_FROM && <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">stall region</span>}
                  </td>
                  {series.map((s) => (
                    <td key={s.id} className="py-1.5 pl-4 text-right tabular-nums">
                      {fmtCl(liftCoefficient(a, s.zeroLift))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ul className="mt-5 space-y-2 border-t border-slate-200 dark:border-white/10 pt-4 list-none p-0 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        <li>
          cl = 2π(α − α<sub>L0</sub>). The 4412's zero-lift angle, {fmtAlpha(cambered.zeroLift)}, is integrated here from its camber
          line (4% camber at 40% chord); the 0012 has no camber, so its line passes through the origin.
        </li>
        <li>
          Inviscid and two-dimensional: no thickness, viscosity, Reynolds number or stall. The study's lift and drag came from
          transient ANSYS Fluent runs with a leading airfoil's wake, and none of those results are plotted here.
        </li>
      </ul>
    </figure>
  );
};

export default LiftCurveExplorer;
