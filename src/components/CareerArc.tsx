import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  axisPercent,
  buildCareerArc,
  describeRow,
  durationLabel,
  endLabel,
  FOCUS,
  formatMonth,
  type ArcKind,
  type ArcRow,
} from '../utils/careerArc';
import type { FocusArea } from '../types/content';

/**
 * CareerArc — every role and degree since 2018 on one to-scale time axis,
 * coloured by the field the work was in.
 *
 * Flight Log below lists the same roles in detail; this shows their SHAPE,
 * which a list cannot. The site's tagline says "aerospace to AI", and the chart
 * is deliberately truer than the tagline: the first AI work runs alongside the
 * aerospace work rather than after it, and the gaps are where they are. A
 * chart that tidied that into a clean handoff would be the decorative version.
 *
 * Built as HTML rather than SVG so labels wrap, text stays crisp and the page's
 * theme tokens apply without translation. Every value is reachable three ways
 * (per the dataviz accessibility rules): the bar's accessible name, a hover or
 * focus tooltip, and a table view.
 */

interface Props {
  /** Injected in tests; the live site uses the current month. */
  now?: Date;
}

const GROUPS: Array<{ kind: ArcKind; label: string }> = [
  { kind: 'work', label: 'Work' },
  { kind: 'study', label: 'Study' },
];

/** Legend and table order: the order each field first appears on the arc. */
function focusOrder(rows: ArcRow[]): FocusArea[] {
  const seen: FocusArea[] = [];
  for (const r of rows) if (!seen.includes(r.focus)) seen.push(r.focus);
  return seen;
}

/** "Defence Research and Development Organisation (DRDO)" -> "DRDO". */
function shortName(title: string): string {
  const acronym = /\(([A-Z][A-Za-z0-9.&]{1,10})\)\s*$/.exec(title);
  return acronym ? acronym[1] : title;
}

const colour = (focus: FocusArea) => `var(${FOCUS[focus].cssVar})`;

const CareerArc = ({ now }: Props) => {
  const arc = useMemo(() => buildCareerArc(now ?? new Date()), [now]);
  const order = useMemo(() => focusOrder(arc.rows), [arc]);
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const [tip, setTip] = useState<{ id: string; pinned: boolean } | null>(null);
  const [tipPos, setTipPos] = useState<{ top: number; left: number } | null>(null);
  const chartRef = useRef<HTMLDivElement | null>(null);
  const barRefs = useRef(new Map<string, HTMLButtonElement>());

  const active = tip ? arc.rows.find((r) => r.id === tip.id) ?? null : null;

  const place = useCallback((id: string) => {
    const bar = barRefs.current.get(id);
    const box = chartRef.current;
    if (!bar || !box) return;
    const b = bar.getBoundingClientRect();
    const c = box.getBoundingClientRect();
    const half = 128; // half the tooltip width, so it never overflows the card
    const centre = b.left + b.width / 2 - c.left;
    setTipPos({ top: b.bottom - c.top + 6, left: Math.min(Math.max(centre, half), Math.max(half, c.width - half)) });
  }, []);

  const open = useCallback(
    (id: string, pinned = false) => {
      setTip({ id, pinned });
      place(id);
    },
    [place],
  );
  const close = useCallback(() => setTip(null), []);

  // A pinned tooltip (tapped, on touch) closes on any tap outside its bar, and
  // on Escape — otherwise it would sit over the chart until the page unloads.
  useEffect(() => {
    if (!tip?.pinned) return;
    const onDown = (e: PointerEvent) => {
      const bar = barRefs.current.get(tip.id);
      if (bar && !bar.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [tip, close]);

  const nowPct = axisPercent(arc, arc.now);
  const gridlines = arc.years.map((y) => axisPercent(arc, y * 12));

  return (
    <>
    {/* OPAQUE, deliberately. The first version used the site's translucent
        card (bg-white/5) and the animated starfield showed through the plot — one
        star sat exactly on the Now line and read as a data point. #0f0d1f is also
        the surface the palette was validated against. */}
    <figure className="mb-16 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f0d1f] p-5 sm:p-8">
      <figcaption className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">The arc, to scale</h3>
          <p className="mt-1 max-w-xl text-sm text-slate-600 dark:text-slate-400">
            Every role and degree since {arc.years[0]}, placed by date and coloured by the field the work
            was in. Totals count overlapping time once.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            close();
            setView((v) => (v === 'chart' ? 'table' : 'chart'));
          }}
          aria-pressed={view === 'table'}
          className="shrink-0 rounded-lg border border-slate-300 dark:border-white/15 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {view === 'chart' ? 'View as table' : 'View as chart'}
        </button>
      </figcaption>

      {/* Legend: always present for more than one series. Swatches carry the
          colour; the text beside them stays in ink. */}
      <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 list-none p-0" aria-label="Fields">
        {order.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm">
            <span aria-hidden="true" className="inline-block h-2.5 w-4 rounded-sm" style={{ background: colour(f) }} />
            <span className="font-medium text-slate-800 dark:text-slate-100">{FOCUS[f].label}</span>
            <span className="text-slate-500 dark:text-slate-400 tabular-nums">{durationLabel(arc.totals[f])}</span>
          </li>
        ))}
        {arc.rows.some((r) => r.projected) && (
          <li className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-4 rounded-sm bg-slate-400 opacity-35 dark:bg-slate-300"
            />
            Still to come
          </li>
        )}
      </ul>

      {view === 'table' ? (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <caption className="sr-only">Roles and degrees since {arc.years[0]}, with field and dates</caption>
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th scope="col" className="py-2 pr-4 font-semibold">Organisation</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Role or degree</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Field</th>
                <th scope="col" className="py-2 pr-4 font-semibold">From</th>
                <th scope="col" className="py-2 pr-4 font-semibold">To</th>
                <th scope="col" className="py-2 font-semibold">Length</th>
              </tr>
            </thead>
            <tbody>
              {arc.rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 dark:border-white/5 text-slate-700 dark:text-slate-200">
                  <td className="py-2 pr-4 font-medium text-slate-900 dark:text-white">{r.title}</td>
                  <td className="py-2 pr-4">{r.subtitle}</td>
                  <td className="py-2 pr-4">
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: colour(r.focus) }} />
                      {FOCUS[r.focus].label}
                    </span>
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap tabular-nums">{formatMonth(r.start)}</td>
                  <td className="py-2 pr-4 whitespace-nowrap tabular-nums">{endLabel(r)}</td>
                  <td className="py-2 whitespace-nowrap tabular-nums">
                    {durationLabel(r.months)}
                    {r.ongoing ? ' so far' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={chartRef} className="relative mt-6" onMouseLeave={() => tip && !tip.pinned && close()}>
          {/* Year axis. Odd years drop out on narrow screens so labels never collide. */}
          <div className="sm:grid sm:grid-cols-[11rem_1fr]" aria-hidden="true">
            <div className="hidden sm:block" />
            <div className="relative h-5 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              {arc.years.slice(0, -1).map((y, i) => (
                <span
                  key={y}
                  className={`absolute top-0 -translate-x-1/2 ${i % 2 ? 'hidden sm:inline' : ''}`}
                  style={{ left: `${axisPercent(arc, y * 12 + 6)}%` }}
                >
                  {y}
                </span>
              ))}
            </div>
          </div>

          {GROUPS.map((group) => {
            const rows = arc.rows.filter((r) => r.kind === group.kind);
            if (!rows.length) return null;
            return (
              <div key={group.kind}>
                <h4 className="mt-3 mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {group.label}
                </h4>
                <ul className="list-none p-0">
                  {rows.map((row) => {
                    const left = axisPercent(arc, row.start);
                    const width = Math.max(axisPercent(arc, row.end + 1) - left, 0.8);
                    const solidShare = ((row.solidEnd - row.start + 1) / (row.end - row.start + 1)) * 100;
                    const isActive = tip?.id === row.id;
                    return (
                      <li key={row.id} className="sm:grid sm:grid-cols-[11rem_1fr]">
                        <div className="min-w-0 pt-2 pr-3 sm:py-1.5">
                          <p className="text-sm font-medium leading-tight text-slate-900 dark:text-white" title={row.title}>
                            {shortName(row.title)}
                          </p>
                          <p className="text-xs leading-tight text-slate-500 dark:text-slate-400">{row.subtitle}</p>
                        </div>
                        <div className="relative min-h-9 self-stretch">
                          {gridlines.map((g) => (
                            <span
                              key={g}
                              aria-hidden="true"
                              className="absolute inset-y-0 w-px bg-slate-200 dark:bg-white/10"
                              style={{ left: `${g}%` }}
                            />
                          ))}
                          <span
                            aria-hidden="true"
                            className="absolute inset-y-0 w-px bg-slate-500/70 dark:bg-slate-400/60"
                            style={{ left: `${nowPct}%` }}
                          />
                          {/* The hit target is the full row height (36px), well
                              above the 24px minimum; the visible mark is 14px. */}
                          <button
                            type="button"
                            ref={(el) => {
                              if (el) barRefs.current.set(row.id, el);
                              else barRefs.current.delete(row.id);
                            }}
                            aria-label={describeRow(row)}
                            onMouseEnter={() => open(row.id)}
                            onFocus={() => open(row.id)}
                            onBlur={() => tip && !tip.pinned && close()}
                            onClick={() => (isActive && tip?.pinned ? close() : open(row.id, true))}
                            className="group absolute inset-y-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            style={{ left: `${left}%`, width: `${width}%` }}
                          >
                            <span
                              className={`absolute inset-x-0 top-1/2 flex h-3.5 -translate-y-1/2 overflow-hidden rounded transition-[filter] ${
                                isActive ? 'brightness-110' : 'group-hover:brightness-110'
                              }`}
                            >
                              <span className="h-full" style={{ width: `${solidShare}%`, background: colour(row.focus) }} />
                              {row.projected && (
                                <span className="h-full flex-1 opacity-35" style={{ background: colour(row.focus) }} />
                              )}
                            </span>
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}

          <div className="sm:grid sm:grid-cols-[11rem_1fr]" aria-hidden="true">
            <div className="hidden sm:block" />
            <div className="relative h-5 text-[11px] font-medium text-slate-700 dark:text-slate-300">
              <span className="absolute top-1 -translate-x-1/2 whitespace-nowrap" style={{ left: `${nowPct}%` }}>
                Now
              </span>
            </div>
          </div>

          {/* Visual only: the bar's accessible name already carries every word. */}
          {active && tipPos && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute z-20 w-64 -translate-x-1/2 rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0b0a1a] p-3 text-left shadow-lg"
              style={{ top: tipPos.top, left: tipPos.left }}
            >
              <p className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                {formatMonth(active.start)} – {endLabel(active)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {durationLabel(active.months)}
                {active.ongoing ? ' so far' : ''}
              </p>
              <div className="mt-2 flex items-start gap-2">
                <span aria-hidden="true" className="mt-2 h-0.5 w-3 shrink-0 rounded" style={{ background: colour(active.focus) }} />
                <div className="min-w-0">
                  <p className="text-sm text-slate-800 dark:text-slate-100">{active.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {active.subtitle} · {FOCUS[active.focus].label}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </figure>
    </>
  );
};

export default CareerArc;
