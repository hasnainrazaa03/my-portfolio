import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { STARS, EDGES, PATH_ORDER, CATEGORY_COLOUR, projectOf, edgeBetween, neighboursOf, hrefOf, type Star } from '../../lab/constellation/data';

/**
 * Constellation — an index of selected projects drawn as a star map.
 *
 * Stars never move (a drifting star cannot be clicked), names are always
 * shown, and a line exists only where two projects share a real engineering
 * pattern; hovering the line says what it is. Hovering or focusing a star
 * brightens it, fades the lines that are not its own, and opens a preview
 * card; clicking opens the case study. Each star is a real link, so the
 * keyboard reaches everything a pointer does.
 *
 * On phones the map becomes a vertical path of the same projects, with the
 * shared pattern written between neighbours that have one: no tiny targets.
 */

const W = 1000;
const H = 560;

/** A quiet, fixed starfield behind the map: deterministic, so it never twinkles or moves. */
const DUST = Array.from({ length: 70 }, (_, i) => {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 43758.5453;
  return { x: (a - Math.floor(a)) * W, y: (b - Math.floor(b)) * H, r: 0.6 + ((i * 7) % 3) * 0.4 };
});

interface Props {
  /** A project title to highlight from outside (a hovered card below the map). */
  highlight?: string | null;
}

const radius = (s: Star) => 14 + s.weight * 5;

const Constellation = ({ highlight = null }: Props) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const [edgeHover, setEdgeHover] = useState<string | null>(null);
  const active = hovered ?? highlight;
  const activeStar = active ? STARS.find((s) => s.title === active) ?? null : null;
  const neighbours = active ? neighboursOf(active) : [];
  const activeEdge = edgeHover ? EDGES.find((e) => `${e.a}|${e.b}` === edgeHover) ?? null : null;

  const starOpacity = (s: Star) => (!active || s.title === active || neighbours.includes(s.title) ? 1 : 0.35);
  const edgeOpacity = (a: string, b: string) => {
    if (edgeHover === `${a}|${b}`) return 0.95;
    if (!active) return 0.45;
    return a === active || b === active ? 0.9 : 0.12;
  };

  return (
    <div>
      {/* The map, md and up. */}
      <div className="relative hidden md:block">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full text-slate-400 dark:text-slate-500" role="group" aria-label="Project constellation">
          <defs>
            <filter id="star-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="10" />
            </filter>
          </defs>

          <g aria-hidden="true" className="text-slate-400 dark:text-slate-300">
            {DUST.map((d, i) => (
              <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="currentColor" fillOpacity="0.35" />
            ))}
          </g>

          {EDGES.map((e) => {
            const a = STARS.find((s) => s.title === e.a)!;
            const b = STARS.find((s) => s.title === e.b)!;
            const key = `${e.a}|${e.b}`;
            return (
              <g key={key} onMouseEnter={() => setEdgeHover(key)} onMouseLeave={() => setEdgeHover(null)}>
                {/* Wide invisible hit area so the line is easy to hover. */}
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth="18" />
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="currentColor"
                  strokeWidth={edgeHover === key ? 2 : 1.2}
                  strokeOpacity={edgeOpacity(e.a, e.b)}
                  strokeDasharray={edgeHover === key ? undefined : '1 6'}
                  strokeLinecap="round"
                  className="transition-[stroke-opacity] duration-200"
                >
                  <title>{e.shared}</title>
                </line>
              </g>
            );
          })}

          {STARS.map((s) => {
            const project = projectOf(s);
            const colour = project ? CATEGORY_COLOUR[project.category] : 'currentColor';
            const r = radius(s);
            const isActive = s.title === active;
            const Icon = s.icon;
            return (
              <a
                key={s.title}
                href={hrefOf(s)}
                aria-label={`${s.label}: ${s.blurb} Open the case study.`}
                onMouseEnter={() => setHovered(s.title)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(s.title)}
                onBlur={() => setHovered(null)}
                className="cursor-pointer outline-none transition-opacity duration-200 focus-visible:[&>circle:nth-child(2)]:stroke-white"
                style={{ opacity: starOpacity(s) }}
              >
                <circle cx={s.x} cy={s.y} r={r * (isActive ? 2.2 : 1.6)} fill={colour} fillOpacity={isActive ? 0.55 : 0.28} filter="url(#star-glow)" />
                <circle cx={s.x} cy={s.y} r={r} fill={colour} fillOpacity={0.14} stroke={colour} strokeWidth={isActive ? 3 : 2} />
                <circle cx={s.x} cy={s.y} r={r - 6} className="fill-white dark:fill-[#0b0a1a]" />
                <g transform={`translate(${s.x - 10} ${s.y - 10})`} className="text-slate-800 dark:text-slate-100">
                  <Icon size={20} strokeWidth={2} aria-hidden="true" />
                </g>
                <text x={s.x} y={s.y + r + 20} textAnchor="middle" fontSize="15" fontWeight="600" className="fill-slate-800 dark:fill-slate-100">
                  {s.label}
                </text>
                {project && (
                  <text x={s.x} y={s.y + r + 36} textAnchor="middle" fontSize="11" className="fill-slate-500 dark:fill-slate-400">
                    {project.category}
                  </text>
                )}
              </a>
            );
          })}
        </svg>

        {/* Preview card beside the star — to its right on the left half of the
            map, to its left on the right half — so it never covers a neighbour. */}
        {activeStar && (
          <div
            className="pointer-events-none absolute z-10 w-72 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-white/15 dark:bg-[#0b0a1a]/95"
            style={{
              left: activeStar.x < W / 2 ? `${(activeStar.x / W) * 100 + 5}%` : undefined,
              right: activeStar.x >= W / 2 ? `${100 - (activeStar.x / W) * 100 + 5}%` : undefined,
              top: `${Math.min(Math.max((activeStar.y / H) * 100 - 10, 2), 60)}%`,
            }}
          >
            <p className="font-bold text-slate-900 dark:text-white">{activeStar.label}</p>
            <p className="mt-1 text-sm leading-snug text-slate-600 dark:text-slate-300">{activeStar.blurb}</p>
            <ul className="mt-2 flex flex-wrap gap-1.5 list-none p-0">
              {activeStar.skills.map((k) => (
                <li key={k} className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {k}
                </li>
              ))}
            </ul>
            <p className="mt-3 flex items-center gap-1 text-sm font-semibold text-primary">
              View case study <ArrowRight size={14} aria-hidden="true" />
            </p>
          </div>
        )}

        {/* What a hovered line or star's connections mean. */}
        <p className="mt-2 min-h-[1.5rem] text-sm text-slate-600 dark:text-slate-300" aria-live="polite">
          {activeEdge ? (
            <>
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                {STARS.find((s) => s.title === activeEdge.a)?.label} — {STARS.find((s) => s.title === activeEdge.b)?.label}:
              </span>{' '}
              {activeEdge.shared}
            </>
          ) : activeStar && neighbours.length ? (
            <>
              <span className="font-semibold text-slate-800 dark:text-slate-100">{activeStar.label}</span> connects to{' '}
              {neighbours.map((n) => STARS.find((s) => s.title === n)?.label).join(', ')} — hover a line to see why.
            </>
          ) : (
            'Hover a star for a preview, a line for what two projects share. Click a star to open its case study.'
          )}
        </p>
      </div>

      {/* The path, below md. */}
      <ol className="relative md:hidden list-none p-0 pl-6">
        <span aria-hidden="true" className="absolute left-2 top-4 bottom-4 w-px bg-gradient-to-b from-primary/60 via-slate-300 to-primary/60 dark:via-white/15" />
        {PATH_ORDER.map((title, i) => {
          const s = STARS.find((x) => x.title === title)!;
          const project = projectOf(s);
          const colour = project ? CATEGORY_COLOUR[project.category] : 'currentColor';
          const next = PATH_ORDER[i + 1];
          const link = next ? edgeBetween(title, next) : undefined;
          const Icon = s.icon;
          return (
            <li key={title} className="relative pb-6">
              <span aria-hidden="true" className="absolute -left-6 top-3 h-4 w-4 -translate-x-[1px] rounded-full border-2 bg-white dark:bg-[#0b0a1a]" style={{ borderColor: colour }} />
              <a
                href={hrefOf(s)}
                className="block rounded-xl border border-slate-200 bg-white/70 p-4 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/10 dark:bg-white/[0.03]"
              >
                <span className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: `color-mix(in srgb, ${colour} 18%, transparent)`, color: colour }}>
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">{s.label}</span>
                  {project && <span className="ml-auto text-[11px] text-slate-500 dark:text-slate-400">{project.category}</span>}
                </span>
                <span className="mt-2 block text-sm leading-snug text-slate-600 dark:text-slate-300">{s.blurb}</span>
                <span className="mt-2 flex items-center gap-1 text-sm font-semibold text-primary">
                  View case study <ArrowRight size={14} aria-hidden="true" />
                </span>
              </a>
              {link && <p className="mt-3 pl-1 text-xs leading-snug text-slate-500 dark:text-slate-400">↓ {link.shared}</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default Constellation;
