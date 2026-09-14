/**
 * period.test.js — the career arc places bars from human-written periods.
 *
 * The strings in constants.ts stay the single source of truth, so the parser
 * has to be strict: a period it cannot read must be rejected (the content
 * schema surfaces that), never guessed at and never silently dropped.
 */
import { describe, it, expect } from 'vitest';
import {
  parsePeriod,
  durationLabel,
  formatMonth,
  coveredMonths,
  toMonthIndex,
  monthIndexOfDate,
  yearsOnly,
} from '../utils/period';

const m = (y, mo) => toMonthIndex(y, mo); // mo is 0-based

describe('parsePeriod', () => {
  it('reads a closed period', () => {
    expect(parsePeriod('Aug 2022 - Nov 2024')).toEqual({ start: m(2022, 7), end: m(2024, 10), expected: false });
  });

  it('accepts an en dash or em dash as well as a hyphen', () => {
    for (const sep of ['-', '–', '—']) {
      expect(parsePeriod(`Aug 2022 ${sep} Nov 2024`)?.end, sep).toBe(m(2024, 10));
    }
  });

  it('reads an ongoing period as an open end', () => {
    expect(parsePeriod('Mar 2026 - Present')).toEqual({ start: m(2026, 2), end: null, expected: false });
  });

  it('flags an expected end', () => {
    expect(parsePeriod('Aug 2025 - Dec 2027 (Expected)')).toEqual({ start: m(2025, 7), end: m(2027, 11), expected: true });
  });

  it('accepts full month names too', () => {
    expect(parsePeriod('September 2018 - August 2022')?.start).toBe(m(2018, 8));
  });

  it('REJECTS year-only periods rather than drawing them from January', () => {
    // "2018 - 2022" would place a bar starting eight months before the degree
    // did. The schema turns this rejection into a content error.
    expect(parsePeriod('2018 - 2022')).toBeNull();
    expect(parsePeriod('2025 - 2027 (Expected)')).toBeNull();
  });

  it('rejects an end before its start, and nonsense', () => {
    expect(parsePeriod('Nov 2024 - Aug 2022')).toBeNull();
    expect(parsePeriod('Present (Expected)')).toBeNull();
    expect(parsePeriod('Mar 2026 - Present (Expected)')).toBeNull();
    expect(parsePeriod('Foo 2020 - Bar 2021')).toBeNull();
    expect(parsePeriod('')).toBeNull();
    expect(parsePeriod(undefined)).toBeNull();
  });
});

describe('labels', () => {
  it('formats durations the way a résumé would', () => {
    expect(durationLabel(28)).toBe('2 yr 4 mo');
    expect(durationLabel(12)).toBe('1 yr');
    expect(durationLabel(4)).toBe('4 mo');
    expect(durationLabel(0)).toBe('1 mo');
  });

  it('formats a month index', () => {
    expect(formatMonth(m(2019, 8))).toBe('Sep 2019');
    expect(formatMonth(monthIndexOfDate(new Date(2026, 0, 15)))).toBe('Jan 2026');
  });
});

describe('coveredMonths', () => {
  it('returns 0, not NaN, for nothing — the first version returned NaN for EVERYTHING', () => {
    // It seeded the merge from -Infinity and computed -Infinity - -Infinity on
    // the first interval. Every total on the chart read "NaN mo", and no type
    // or lint check could see it; rendering the chart and looking did.
    expect(coveredMonths([])).toBe(0);
    expect(Number.isNaN(coveredMonths([[0, 11]]))).toBe(false);
  });

  it('counts one interval inclusively', () => {
    expect(coveredMonths([[m(2022, 0), m(2022, 11)]])).toBe(12);
  });

  it('counts overlapping time once', () => {
    // RVCE (Aug 2018-Jul 2022) and Team Antariksh (Sep 2018-Aug 2022) run in
    // parallel; summing them would claim eight years of aerospace in four.
    expect(coveredMonths([[m(2018, 7), m(2022, 6)], [m(2018, 8), m(2022, 7)]])).toBe(49);
  });

  it('joins adjacent intervals and keeps real gaps', () => {
    expect(coveredMonths([[0, 5], [6, 11]])).toBe(12);
    expect(coveredMonths([[0, 5], [8, 9]])).toBe(8);
  });

  it('is independent of input order', () => {
    expect(coveredMonths([[8, 9], [0, 5], [3, 7]])).toBe(coveredMonths([[0, 5], [3, 7], [8, 9]]));
  });
});

describe('yearsOnly', () => {
  it('shows the cards the compact form they always had', () => {
    expect(yearsOnly('Aug 2025 - Dec 2027 (Expected)')).toBe('2025 – 2027 (Expected)');
    expect(yearsOnly('Aug 2018 - Jul 2022')).toBe('2018 – 2022');
    expect(yearsOnly('Mar 2026 - Present')).toBe('2026 – Present');
  });

  it('leaves anything it cannot parse exactly as written', () => {
    expect(yearsOnly('2015 - 2017')).toBe('2015 - 2017');
  });
});
