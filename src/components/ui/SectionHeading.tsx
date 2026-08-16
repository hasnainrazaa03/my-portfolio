import type { ReactNode } from 'react';

/**
 * SectionHeading — the one place a section header is styled.
 *
 * WHY: the eight section headers had drifted into four different subtitle
 * treatments (`text-lg` + slate-200, `text-lg` + white, `text-sm` + slate-400,
 * and base + opacity-90) and six different gaps below the header (mb-2, mb-6,
 * mb-10, mb-12, mb-16, plus a nested mb-10 inside an mb-16 wrapper). Same
 * heading, eight slightly different sizes of silence around it.
 *
 * The numeric prefix is a design motif, so it lives here too rather than being
 * hand-written per section.
 */
export interface SectionHeadingProps {
  /** Two-digit motif prefix, e.g. "03". Omit for unnumbered headings. */
  number?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Rendered above the title — used by the GitHub section's logo. */
  eyebrow?: ReactNode;
  /** Extra classes on the wrapper (e.g. to override the bottom gap). */
  className?: string;
  /** Set when a section labels itself via aria-labelledby. */
  id?: string;
}

export default function SectionHeading({
  number,
  title,
  subtitle,
  eyebrow,
  className = '',
  id,
}: SectionHeadingProps) {
  return (
    <div className={`text-center mb-14 ${className}`.trim()}>
      {eyebrow && <div className="mb-4 flex items-center justify-center gap-3">{eyebrow}</div>}

      <h2
        id={id}
        className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white"
      >
        {number && <span className="text-primary">{number}.</span>}
        {number ? ' ' : null}
        {title}
      </h2>

      {subtitle && (
        // max-w-2xl caps the measure: centred prose spanning a 7xl container
        // runs past a comfortable line length on wide screens.
        <p className="mx-auto mt-4 max-w-2xl text-lg font-medium text-slate-600 dark:text-slate-300">
          {subtitle}
        </p>
      )}
    </div>
  );
}
