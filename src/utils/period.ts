/**
 * period.ts — turn the human-written `period` strings in constants.ts into
 * dates a chart can place.
 *
 * The strings stay the source of truth: they are what every card, the résumé
 * and the chat already render, and adding separate start/end fields next to
 * them would give the same fact two homes that drift apart. So this parses
 * them — strictly. A period the parser cannot read is an ERROR surfaced by the
 * content schema, never a bar that silently vanishes from the chart.
 *
 * Accepted forms, which are the forms constants.ts actually uses:
 *   "Aug 2022 - Nov 2024"
 *   "Mar 2026 - Present"
 *   "Aug 2025 - Dec 2027 (Expected)"
 * Hyphen, en dash or em dash between the ends. Month precision is required:
 * a bare "2018 - 2022" would have to be drawn as January to January, which
 * misstates when things happened by most of a year.
 */

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** Months since year 0, so intervals are plain integer arithmetic. */
export type MonthIndex = number;

export interface ParsedPeriod {
  start: MonthIndex;
  /** Inclusive last month. `null` means ongoing ("Present"). */
  end: MonthIndex | null;
  /** The end is in the future by the author's own account ("(Expected)"). */
  expected: boolean;
}

export const toMonthIndex = (year: number, month0: number): MonthIndex => year * 12 + month0;
export const yearOf = (m: MonthIndex): number => Math.floor(m / 12);
export const monthOf = (m: MonthIndex): number => m % 12;

export function monthIndexOfDate(date: Date): MonthIndex {
  return toMonthIndex(date.getFullYear(), date.getMonth());
}

function parseMonthYear(text: string): MonthIndex | null {
  const m = /^([A-Za-z]{3})[a-z]*\.?\s+(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const month = MONTHS.indexOf(m[1].toLowerCase());
  return month < 0 ? null : toMonthIndex(Number(m[2]), month);
}

/** Parse a period, or return null when it is not in an accepted form. */
export function parsePeriod(period: string): ParsedPeriod | null {
  const raw = String(period ?? '').trim();
  const expected = /\(expected\)\s*$/i.test(raw);
  const body = raw.replace(/\(expected\)\s*$/i, '').trim();

  const parts = body.split(/\s+[-–—]\s+/);
  if (parts.length !== 2) return null;

  const start = parseMonthYear(parts[0]);
  if (start === null) return null;

  if (/^present$/i.test(parts[1].trim())) {
    // "Present (Expected)" says nothing coherent.
    return expected ? null : { start, end: null, expected: false };
  }

  const end = parseMonthYear(parts[1]);
  if (end === null || end < start) return null;
  return { start, end, expected };
}

/** "3 yr 2 mo", "11 mo", "1 yr". Inclusive of both end months. */
export function durationLabel(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years && rest) return `${years} yr ${rest} mo`;
  if (years) return `${years} yr`;
  return `${Math.max(1, rest)} mo`;
}

export function formatMonth(m: MonthIndex): string {
  const name = MONTHS[monthOf(m)];
  return `${name[0].toUpperCase()}${name.slice(1)} ${yearOf(m)}`;
}

/**
 * Total months covered by a set of intervals, with overlaps counted once.
 *
 * Summing durations would double-count the stretch where two roles in the same
 * field ran concurrently, and report more time in that field than there is
 * calendar for.
 */
export function coveredMonths(intervals: Array<[MonthIndex, MonthIndex]>): number {
  const sorted = intervals.filter(([a, b]) => b >= a).sort((x, y) => x[0] - y[0]);
  if (!sorted.length) return 0;
  // Seeded from the first real interval. The first version seeded from
  // -Infinity and computed -Infinity - -Infinity on the first merge, which is
  // NaN — every total on the chart read "NaN mo", and only rendering it and
  // looking caught that.
  let total = 0;
  let [curStart, curEnd] = sorted[0];
  for (const [a, b] of sorted.slice(1)) {
    if (a > curEnd + 1) {
      total += curEnd - curStart + 1;
      curStart = a;
      curEnd = b;
    } else {
      curEnd = Math.max(curEnd, b);
    }
  }
  return total + (curEnd - curStart + 1);
}

/**
 * A period as the Education cards show it: years only, "2025 – 2027 (Expected)".
 *
 * The data is month-precise because the career arc needs months, but the
 * cards never showed months and the longer text wrapped onto two lines beside
 * the logo. Anything the parser cannot read is shown exactly as written.
 */
export function yearsOnly(period: string): string {
  const parsed = parsePeriod(period);
  if (!parsed) return period;
  const end = parsed.end === null ? 'Present' : String(yearOf(parsed.end));
  return `${yearOf(parsed.start)} – ${end}${parsed.expected ? ' (Expected)' : ''}`;
}
