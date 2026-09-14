import React, { useState } from 'react';
import { niceCeiling } from '../../utils/insightsView';

/**
 * Charts for the private insights page. Every chart here is a SINGLE series,
 * so none carries a legend: the card title names what is plotted. The mark
 * colour is one validated token (`--viz-accent`, teal-600, at least 3.7:1 on
 * both card surfaces); text stays in ink, never in the series colour.
 */
const MARK = 'var(--viz-accent)';

export interface Datum {
  key: string;
  label: string;
  count: number;
}

/**
 * Horizontal bars for a ranking (topics, named work). Few enough bars that the
 * value sits at every tip, which is the direct label a ranking needs; the
 * page's table view carries the same numbers without the bars.
 */
export const BarList = ({ data, empty }: { data: Datum[]; empty: string }) => {
  if (!data.length) return <p className="text-sm text-slate-500 dark:text-slate-400">{empty}</p>;
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <ul className="space-y-2.5 list-none p-0">
      {data.map((d) => (
        <li key={d.key} className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 text-sm">
          <span className="truncate text-slate-700 dark:text-slate-200" title={d.label}>
            {d.label}
          </span>
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="block h-3.5 rounded-r"
              style={{ width: `${Math.max((d.count / max) * 100, 2)}%`, background: MARK }}
            />
            <span className="tabular-nums text-xs font-medium text-slate-600 dark:text-slate-300">{d.count}</span>
          </span>
        </li>
      ))}
    </ul>
  );
};

/**
 * Columns over a sequence (days, hours). Too many to label every value, so
 * values come from the y-axis and from a tooltip on hover or keyboard focus —
 * which enhances, never gates: the table view has every number.
 */
export const ColumnChart = ({
  data,
  ariaLabel,
  labelEvery = 1,
}: {
  data: Datum[];
  ariaLabel: string;
  /** Show every nth x label so they never collide. */
  labelEvery?: number;
}) => {
  const [active, setActive] = useState<number | null>(null);
  const ceiling = niceCeiling(Math.max(...data.map((d) => d.count), 0));
  const ticks = [ceiling, ceiling / 2, 0];

  return (
    <div className="relative" role="group" aria-label={ariaLabel} onMouseLeave={() => setActive(null)}>
      <div className="grid grid-cols-[2rem_1fr] gap-2">
        {/* y-axis ticks, recessive */}
        <div className="relative h-40 text-right text-[10px] tabular-nums text-slate-500 dark:text-slate-400" aria-hidden="true">
          {ticks.map((t, i) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}>
              {Number.isInteger(t) ? t : t.toFixed(1)}
            </span>
          ))}
        </div>

        <div>
          <div className="relative h-40">
            {ticks.map((t, i) => (
              <span
                key={t}
                aria-hidden="true"
                className="absolute inset-x-0 h-px bg-slate-200 dark:bg-white/10"
                style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}
              />
            ))}
            {/* 2px surface gap between neighbours comes from the gap utility. */}
            <div className="absolute inset-0 flex items-end gap-[2px]">
              {data.map((d, i) => (
                <button
                  key={d.key}
                  type="button"
                  aria-label={`${d.label}: ${d.count} question${d.count === 1 ? '' : 's'}`}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className="group relative flex h-full flex-1 items-end justify-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span
                    aria-hidden="true"
                    className={`block w-full max-w-[24px] rounded-t transition-[filter] ${active === i ? 'brightness-110' : ''}`}
                    style={{
                      height: `${(d.count / ceiling) * 100}%`,
                      minHeight: d.count ? 2 : 0,
                      background: MARK,
                    }}
                  />
                </button>
              ))}
            </div>

            {active !== null && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0b0a1a] px-2.5 py-1.5 text-left shadow-lg"
                style={{ left: `${((active + 0.5) / data.length) * 100}%` }}
              >
                <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{data[active].count}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{data[active].label}</p>
              </div>
            )}
          </div>

          {/* Labels are positioned at their bar's centre and never clipped. The
              first version gave each label its own bar's width and truncated
              it, so every tick read "A.." or "1..". */}
          <div className="relative mt-1.5 h-4 text-[10px] text-slate-500 dark:text-slate-400" aria-hidden="true">
            {data.map((d, i) =>
              i % labelEvery === 0 ? (
                <span
                  key={d.key}
                  className="absolute top-0 -translate-x-1/2 whitespace-nowrap"
                  style={{ left: `${((i + 0.5) / data.length) * 100}%` }}
                >
                  {d.label}
                </span>
              ) : null,
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/** The table view for any of the above: every number, no hovering. */
export const DataTable = ({ data, caption, labelHeader }: { data: Datum[]; caption: string; labelHeader: string }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b border-slate-200 dark:border-white/10 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <th scope="col" className="py-1.5 pr-4 font-semibold">{labelHeader}</th>
          <th scope="col" className="py-1.5 font-semibold text-right">Questions</th>
        </tr>
      </thead>
      <tbody>
        {data.map((d) => (
          <tr key={d.key} className="border-b border-slate-100 dark:border-white/5 text-slate-700 dark:text-slate-200">
            <td className="py-1.5 pr-4">{d.label}</td>
            <td className="py-1.5 text-right tabular-nums">{d.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
