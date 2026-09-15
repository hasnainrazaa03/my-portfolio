import React, { useMemo } from 'react';
import { joukowski, type Complex } from '../utils/potentialFlow';
import { ALPHA_DEFAULT, VIEW, scene } from '../utils/flowScene';

/** The picture with no motion: the same streamlines and airfoil as an SVG. */
const FlowFieldStatic = ({ alphaDeg = ALPHA_DEFAULT, className = '' }: { alphaDeg?: number; className?: string }) => {
  const af = useMemo(() => joukowski(), []);
  const { lines, outline } = useMemo(() => scene(af, alphaDeg), [af, alphaDeg]);
  const w = VIEW.right - VIEW.left;
  const h = VIEW.halfHeight * 2;
  const pt = (p: Complex) => `${(p.re - VIEW.left).toFixed(3)},${(VIEW.halfHeight - p.im).toFixed(3)}`;
  return (
    <div className={`relative flex h-full min-h-[400px] w-full items-center justify-center ${className}`}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={`Streamlines of ideal flow around an airfoil at ${alphaDeg} degrees angle of attack`}
        className="h-full w-full text-primary"
        preserveAspectRatio="xMidYMid meet"
      >
        <g fill="none" stroke="currentColor" strokeWidth="0.03" strokeOpacity="0.35" strokeLinejoin="round">
          {lines.map((line, i) => (
            <polyline key={i} points={line.map(pt).join(' ')} />
          ))}
        </g>
        <polygon
          points={outline.map(pt).join(' ')}
          className="fill-slate-900 dark:fill-[#0b0a1a]"
          stroke="currentColor"
          strokeWidth="0.04"
        />
      </svg>
      <p className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-white/70 px-2 py-1 font-mono text-[11px] text-slate-700 backdrop-blur dark:bg-black/40 dark:text-slate-200">
        Ideal flow · α {alphaDeg.toFixed(1)}°
      </p>
    </div>
  );
};

export default FlowFieldStatic;
