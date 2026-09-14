/**
 * careerArc.test.js — the chart's data, checked against the record.
 *
 * `now` is fixed so totals are exact. Expected values were computed by hand
 * from constants.ts, independently of the code under test.
 */
import { describe, it, expect } from 'vitest';
import { buildCareerArc, axisPercent, describeRow, endLabel, FOCUS } from '../utils/careerArc';
import { toMonthIndex } from '../utils/period';
import { EXPERIENCE, EDUCATION } from '../constants';
import { EducationSchema, ExperienceSchema } from '../data/contentSchema';

const NOW = new Date(2026, 8, 14); // 14 Sep 2026
const arc = buildCareerArc(NOW);
const row = (title) => arc.rows.find((r) => r.title.startsWith(title));

describe('rows', () => {
  it('includes every role, and exactly the degrees marked for the arc', () => {
    const work = arc.rows.filter((r) => r.kind === 'work').map((r) => r.title).sort();
    expect(work).toEqual(EXPERIENCE.map((e) => e.company).sort());
    const study = arc.rows.filter((r) => r.kind === 'study').map((r) => r.title).sort();
    expect(study).toEqual(EDUCATION.filter((e) => e.focus).map((e) => e.school).sort());
  });

  it('never lets a degree from the arc years drop off for want of a focus', () => {
    // Absent focus means "before the arc". A new degree added after 2018
    // without one would vanish from the chart silently; this makes it loud.
    for (const ed of EDUCATION) {
      const firstYear = Number(/\d{4}/.exec(ed.period)?.[0]);
      if (firstYear >= arc.years[0]) expect(ed.focus, ed.school).toBeTruthy();
    }
  });

  it('is ordered by start date', () => {
    const starts = arc.rows.map((r) => r.start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it('ends an ongoing role at the current month', () => {
    const peak = row('PeakRoutine');
    expect(peak.ongoing).toBe(true);
    expect(peak.end).toBe(toMonthIndex(2026, 8));
    expect(peak.months).toBe(7); // Mar-Sep 2026 inclusive
    expect(endLabel(peak)).toBe('Present');
  });

  it('draws an expected graduation past today as a projection', () => {
    const usc = row('University of Southern California');
    expect(usc.projected).toBe(true);
    expect(usc.end).toBe(toMonthIndex(2027, 11));
    expect(usc.solidEnd).toBe(toMonthIndex(2026, 8));
    expect(usc.months).toBe(14); // Aug 2025 - Sep 2026, elapsed only
    expect(endLabel(usc)).toBe('Dec 2027 (expected)');
  });
});

describe('totals by field', () => {
  it('match a hand count, with overlaps counted once', () => {
    // aerospace: RVCE Aug 2018 + Antariksh to Aug 2022 + DRDO inside it  -> Aug 2018-Aug 2022 = 49
    // ai:        Prana Sep 2019-Dec 2021 (28) + PeakRoutine/Sunbase merged Mar-Sep 2026 (7) = 35
    // software:  Deloitte Aug 2022-Nov 2024 (28) + USC Aug 2025-Sep 2026 elapsed (14) = 42
    expect(arc.totals).toEqual({ aerospace: 49, ai: 35, software: 42 });
  });

  it('counts no future time', () => {
    const later = buildCareerArc(new Date(2027, 11, 1));
    expect(later.totals.software).toBeGreaterThan(arc.totals.software);
    for (const v of Object.values(arc.totals)) expect(Number.isFinite(v)).toBe(true);
  });
});

describe('axis', () => {
  it('spans whole years around every bar and today', () => {
    expect(arc.axisStart).toBe(toMonthIndex(2018, 0));
    expect(arc.axisEnd).toBe(toMonthIndex(2028, 0));
    expect(arc.years[0]).toBe(2018);
    expect(arc.years.at(-1)).toBe(2028);
  });

  it('places every bar inside the plot', () => {
    for (const r of arc.rows) {
      expect(axisPercent(arc, r.start), r.title).toBeGreaterThanOrEqual(0);
      expect(axisPercent(arc, r.end + 1), r.title).toBeLessThanOrEqual(100);
    }
  });
});

describe('accessible descriptions', () => {
  it('say who, what, which field and when, in words', () => {
    expect(describeRow(row('Prana.ai'))).toBe(
      'Prana.ai, Founding Engineer. AI / ML. Sep 2019 to Dec 2021, 2 yr 4 mo.',
    );
    expect(describeRow(row('PeakRoutine'))).toMatch(/Mar 2026 to Present, 7 mo so far\.$/);
  });
});

describe('colour tokens', () => {
  it('give every field a CSS variable that index.css defines in both themes', async () => {
    const { readFileSync } = await import('node:fs');
    const css = readFileSync('src/index.css', 'utf8');
    const root = css.slice(css.indexOf(':root'), css.indexOf('.dark'));
    const dark = css.slice(css.indexOf('.dark'));
    for (const { cssVar } of Object.values(FOCUS)) {
      expect(root, `${cssVar} light`).toContain(`${cssVar}:`);
      expect(dark, `${cssVar} dark`).toContain(`${cssVar}:`);
    }
  });
});

describe('the schema guards the data the chart depends on', () => {
  const role = EXPERIENCE[0];

  it('rejects a role with an unparseable period', () => {
    expect(ExperienceSchema.safeParse({ ...role, period: '2022 - 2024' }).success).toBe(false);
  });

  it('rejects a role with no focus, or an unknown one', () => {
    const { focus: _focus, ...withoutFocus } = role;
    expect(ExperienceSchema.safeParse(withoutFocus).success).toBe(false);
    expect(ExperienceSchema.safeParse({ ...role, focus: 'marketing' }).success).toBe(false);
  });

  it('allows a year-only period on a degree that is NOT on the arc, and rejects one that is', () => {
    const school = EDUCATION.find((e) => e.focus);
    const { focus: _f, ...offArc } = school;
    expect(EducationSchema.safeParse({ ...offArc, period: '2015 - 2017' }).success).toBe(true);
    expect(EducationSchema.safeParse({ ...school, period: '2015 - 2017' }).success).toBe(false);
  });
});
