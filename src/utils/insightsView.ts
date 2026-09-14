/**
 * insightsView.ts — shape insight timestamps for the viewer's own clock.
 *
 * The server sends ISO timestamps rather than pre-bucketed counts because the
 * useful question is "when do people ask, in MY day?" The previous viewer
 * bucketed hours with the server's `getHours()`, which on Vercel is UTC — a
 * recruiter's 9 a.m. in Los Angeles showed up as 4 p.m.
 */

/** Local calendar date, YYYY-MM-DD, in the runtime's time zone. */
export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface DayCount {
  key: string;
  /** Short label for the axis, e.g. "Sep 14". */
  label: string;
  count: number;
}

/** Questions per local day over the last `days` days, oldest first, zeros included. */
export function dailyCounts(timestamps: string[], now: Date = new Date(), days = 30): DayCount[] {
  const counts = new Map<string, number>();
  for (const t of timestamps) {
    const d = new Date(t);
    if (!Number.isNaN(d.getTime())) counts.set(localDateKey(d), (counts.get(localDateKey(d)) ?? 0) + 1);
  }
  const out: DayCount[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = localDateKey(d);
    out.push({
      key,
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: counts.get(key) ?? 0,
    });
  }
  return out;
}

export interface HourCount {
  hour: number;
  label: string;
  count: number;
}

/** Questions per local hour of day, 0-23. */
export function hourlyCounts(timestamps: string[]): HourCount[] {
  const counts = Array.from({ length: 24 }, () => 0);
  for (const t of timestamps) {
    const d = new Date(t);
    if (!Number.isNaN(d.getTime())) counts[d.getHours()] += 1;
  }
  return counts.map((count, hour) => ({
    hour,
    label: hour === 0 ? '12a' : hour < 12 ? `${hour}a` : hour === 12 ? '12p' : `${hour - 12}p`,
    count,
  }));
}

/** A clean axis ceiling: 1, 2, 5, 10, 20, 50… never below the data. */
export function niceCeiling(max: number): number {
  if (max <= 1) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  for (const step of [1, 2, 5, 10]) {
    if (step * magnitude >= max) return step * magnitude;
  }
  return 10 * magnitude;
}

/** The viewer's time zone name, for saying which clock the chart uses. */
export function timeZoneName(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'your time zone';
  } catch {
    return 'your time zone';
  }
}
