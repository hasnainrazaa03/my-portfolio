import { EDUCATION, EXPERIENCE } from '../constants';
import type { FocusArea } from '../types/content';
import {
  coveredMonths,
  durationLabel,
  formatMonth,
  monthIndexOfDate,
  parsePeriod,
  toMonthIndex,
  yearOf,
  type MonthIndex,
} from './period';

/**
 * careerArc.ts — the data behind the "arc, to scale" chart, kept apart from
 * the component so the arithmetic can be tested without rendering anything.
 *
 * Everything derives from constants.ts. There is no second copy of a date or a
 * field classification anywhere: add a role there and it appears here.
 */

export interface FocusMeta {
  label: string;
  /** CSS custom property holding this field's mark colour, per theme. */
  cssVar: string;
}

/**
 * Colour is assigned by FIELD, never by position, so a filter or a new role
 * can never repaint an existing one. Hues were validated as a set — all pairs,
 * both themes, against the real card surfaces — with the dataviz palette
 * checker: worst colour-blind separation ΔE 12.5, normal-vision 16.1, every
 * mark at least 3:1 on its surface. Change one and re-run the checker.
 */
export const FOCUS: Record<FocusArea, FocusMeta> = {
  aerospace: { label: 'Aerospace', cssVar: '--arc-aerospace' },
  ai: { label: 'AI / ML', cssVar: '--arc-ai' },
  software: { label: 'Software & CS', cssVar: '--arc-software' },
};

export type ArcKind = 'work' | 'study';

export interface ArcRow {
  id: string;
  kind: ArcKind;
  /** Organisation — the row's primary label. */
  title: string;
  /** Role or degree. */
  subtitle: string;
  focus: FocusArea;
  /** The period exactly as the site writes it, for the table and screen readers. */
  periodText: string;
  start: MonthIndex;
  /** Last month drawn. For an ongoing role, this is the current month. */
  end: MonthIndex;
  /** Last month that has actually happened. Past it, the bar is a projection. */
  solidEnd: MonthIndex;
  /** Some of this bar lies in the future (an expected graduation). */
  projected: boolean;
  ongoing: boolean;
  /** Elapsed length to date, inclusive of both end months. */
  months: number;
}

export interface CareerArc {
  rows: ArcRow[];
  /** Axis runs from January of the first year to January after the last. */
  axisStart: MonthIndex;
  axisEnd: MonthIndex;
  now: MonthIndex;
  years: number[];
  /** Months spent in each field up to now, overlaps counted once. */
  totals: Record<FocusArea, number>;
}

export function buildCareerArc(nowDate: Date = new Date()): CareerArc {
  const now = monthIndexOfDate(nowDate);

  const toRow = (
    id: string,
    kind: ArcKind,
    title: string,
    subtitle: string,
    focus: FocusArea,
    periodText: string,
  ): ArcRow => {
    const parsed = parsePeriod(periodText);
    // The content schema rejects unparseable periods, so reaching this is a
    // bypassed validation, not bad data to tolerate quietly.
    if (!parsed) throw new Error(`career arc: cannot place "${title}" — period "${periodText}"`);
    const end = parsed.end ?? now;
    const solidEnd = Math.min(end, now);
    return {
      id,
      kind,
      title,
      subtitle,
      focus,
      periodText,
      start: parsed.start,
      end,
      solidEnd,
      projected: end > now,
      ongoing: parsed.end === null,
      months: Math.max(0, solidEnd - parsed.start + 1),
    };
  };

  const work = EXPERIENCE.map((e) => toRow(`role-${e.id}`, 'work', e.company, e.role, e.focus, e.period));
  const study = EDUCATION.filter((ed) => ed.focus).map((ed) =>
    toRow(`study-${ed.id}`, 'study', ed.school, ed.degree, ed.focus as FocusArea, ed.period),
  );
  const rows = [...work, ...study].sort((a, b) => a.start - b.start || a.end - b.end);

  const firstYear = yearOf(Math.min(...rows.map((r) => r.start)));
  const lastYear = yearOf(Math.max(...rows.map((r) => r.end), now));
  const axisStart = toMonthIndex(firstYear, 0);
  const axisEnd = toMonthIndex(lastYear + 1, 0);
  const years = Array.from({ length: lastYear - firstYear + 2 }, (_, i) => firstYear + i);

  const totals = Object.fromEntries(
    (Object.keys(FOCUS) as FocusArea[]).map((f) => [
      f,
      coveredMonths(
        rows.filter((r) => r.focus === f && r.start <= now).map((r): [number, number] => [r.start, r.solidEnd]),
      ),
    ]),
  ) as Record<FocusArea, number>;

  return { rows, axisStart, axisEnd, now, years, totals };
}

/** Position on the axis as a percentage, for CSS `left` and `width`. */
export function axisPercent(arc: Pick<CareerArc, 'axisStart' | 'axisEnd'>, month: MonthIndex): number {
  return ((month - arc.axisStart) / (arc.axisEnd - arc.axisStart)) * 100;
}

/** The end label: "Present", or "Dec 2027 (expected)". */
export function endLabel(row: ArcRow): string {
  if (row.ongoing) return 'Present';
  return `${formatMonth(row.end)}${row.projected ? ' (expected)' : ''}`;
}

/** One sentence a screen reader can use in place of the bar. */
export function describeRow(row: ArcRow): string {
  const kind = row.kind === 'work' ? row.subtitle : `${row.subtitle}`;
  return (
    `${row.title}, ${kind}. ${FOCUS[row.focus].label}. ` +
    `${formatMonth(row.start)} to ${endLabel(row)}, ${durationLabel(row.months)}${row.ongoing ? ' so far' : ''}.`
  );
}

export { durationLabel, formatMonth };

/**
 * "Defence Research and Development Organisation (DRDO)" -> "DRDO";
 * "University of Southern California" -> "USC"; "RV College of Engineering"
 * -> "RVCE" (an all-caps word is already an abbreviation and is kept whole).
 * A row label has one line;
 * a wrapped institution name pushed its row taller than every other and
 * made the chart look broken. The full name stays in the bar's accessible
 * name, the tooltip, the table and the title attribute.
 */
export function shortName(title: string): string {
  const acronym = /\(([A-Z][A-Za-z0-9.&]{1,10})\)\s*$/.exec(title);
  if (acronym) return acronym[1];
  if (title.length <= 20) return title;
  const initials = title
    .split(/\s+/)
    .filter((w) => !/^(of|and|the|for|de|du)$/i.test(w))
    .map((w) => (/^[A-Z]{2,}$/.test(w) ? w : w[0]))
    .join('')
    .toUpperCase();
  return initials.length >= 2 ? initials : title;
}
