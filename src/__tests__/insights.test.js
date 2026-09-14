/**
 * insights.test.js — the numbers the owner acts on must be right.
 */
import { describe, it, expect } from 'vitest';
import { buildInsights, redact, MENTIONS } from '../../api/_lib/insights.ts';
import { PROJECTS, EXPERIENCE, EDUCATION } from '../constants';

const row = (question, response, session, timestamp) => ({ question, response, session_id: session, timestamp });

const ROWS = [
  row('Tell me about Project Vimaan', 'Vimaan is a voice co-pilot for X-Plane built with DistilBERT.', 's1', '2026-09-10T10:00:00Z'),
  row('How did you handle the safety guards?', 'Four guards stand between the model and the aircraft.', 's1', '2026-09-10T10:02:00Z'),
  row('What did you do at Deloitte?', 'At Deloitte I built a Pega workflow platform.', 's2', '2026-09-11T15:00:00Z'),
  row("What's the weather in LA?", "That's outside my wheelhouse — ask me about my projects or experience!", 's3', '2026-09-12T09:00:00Z'),
  row('What was your GPA in high school chemistry?', "I don't have details on individual courses from high school on the site.", 's3', '2026-09-12T09:01:00Z'),
  row('Can you email me at jane.doe@example.com or call +1 (213) 555-0199?', 'You can reach me via the contact section.', 's4', '2026-09-13T20:00:00Z'),
];

describe('buildInsights', () => {
  const out = buildInsights(ROWS);

  it('counts questions and conversations', () => {
    expect(out.totals.questions).toBe(6);
    expect(out.totals.conversations).toBe(4);
    // per-session counts: s1=2, s2=1, s3=2, s4=1 -> median of [1,1,2,2] = 1.5
    expect(out.totals.medianPerConversation).toBe(1.5);
  });

  it('orders newest first and reports the window', () => {
    expect(out.to).toBe('2026-09-13T20:00:00Z');
    expect(out.from).toBe('2026-09-10T10:00:00Z');
    expect(out.timestamps[0]).toBe('2026-09-13T20:00:00Z');
    expect(out.recent[0].at).toBe('2026-09-13T20:00:00Z');
  });

  it('separates off-topic questions from possible content gaps', () => {
    expect(out.totals.offTopic).toBe(1);
    expect(out.offTopic.map((q) => q.question)).toEqual(["What's the weather in LA?"]);
    expect(out.totals.possibleGaps).toBe(1);
    expect(out.possibleGaps[0].question).toMatch(/high school chemistry/);
  });

  it('does not count an off-topic question toward any topic', () => {
    // The prescribed redirect names "projects or experience"; deriving topics
    // from it filed a weather question under both.
    const weather = out.recent.find((q) => q.question.includes('weather'));
    expect(weather.topics).toEqual([]);
  });

  it('counts named work, including by the name people actually use', () => {
    const byLabel = Object.fromEntries(out.mentions.map((m) => [m.label, m.count]));
    expect(byLabel['Project Vimaan']).toBe(1);
    expect(byLabel.Deloitte).toBe(1);
  });

  it('classifies topics with the same derivation as the chat source chips', () => {
    const ids = out.topics.map((t) => t.id);
    expect(ids).toContain('projects');
    expect(ids).toContain('experience');
  });

  it('never lets contact details a visitor typed leave the server', () => {
    const shown = JSON.stringify(out);
    expect(shown).not.toContain('jane.doe@example.com');
    expect(shown).not.toContain('555-0199');
    expect(out.recent[0].question).toContain('[email]');
    expect(out.recent[0].question).toContain('[phone]');
  });

  it('does not include replies, session ids or anything IP-shaped in the payload', () => {
    const shown = JSON.stringify(out);
    expect(shown).not.toContain('Pega workflow platform');
    expect(shown).not.toContain('"s1"');
    expect(shown).not.toMatch(/ip_address|user_agent/);
  });

  it('ignores rows with no question or an invalid timestamp', () => {
    const r = buildInsights([...ROWS, row('', 'x', 's9', '2026-09-14T00:00:00Z'), row('q', 'x', 's9', 'not a date')]);
    expect(r.totals.questions).toBe(6);
  });

  it('handles an empty table', () => {
    const r = buildInsights([]);
    expect(r.totals).toEqual({ questions: 0, conversations: 0, medianPerConversation: 0, offTopic: 0, possibleGaps: 0 });
    expect(r.from).toBeNull();
  });
});

describe('MENTIONS stays in step with the content', () => {
  const covered = new Set(MENTIONS.flatMap((m) => m.covers));

  it('covers every project, employer and degree on the career arc', () => {
    // The old viewer's word lists had no PeakRoutine, Sunbase or USC Ledger.
    // This fails the moment content outgrows the table.
    const needed = [
      ...PROJECTS.map((p) => p.title),
      ...EXPERIENCE.map((e) => e.company),
      ...EDUCATION.filter((e) => e.focus).map((e) => e.school),
    ];
    const missing = needed.filter((n) => !covered.has(n));
    expect(missing, `add a MENTIONS entry for: ${missing.join(', ')}`).toEqual([]);
  });

  it('only covers things that exist', () => {
    const real = new Set([
      ...PROJECTS.map((p) => p.title),
      ...EXPERIENCE.map((e) => e.company),
      ...EDUCATION.map((e) => e.school),
    ]);
    const orphans = [...covered].filter((c) => !real.has(c));
    expect(orphans).toEqual([]);
  });

  it('does not count "USC Ledger" as USC', () => {
    const usc = MENTIONS.find((m) => m.label === 'USC');
    expect(usc.patterns.some((p) => p.test('tell me about USC Ledger'))).toBe(false);
    expect(usc.patterns.some((p) => p.test('how is your MS at USC going'))).toBe(true);
  });
});

describe('redact', () => {
  it('removes emails and phone numbers, and leaves ordinary numbers alone', () => {
    expect(redact('mail a@b.co')).toBe('mail [email]');
    expect(redact('call 213 555 0199')).toBe('call [phone]');
    expect(redact('or +1 (213) 555-0199 today')).toBe('or [phone] today');
    expect(redact('a 69,918-row set in 2026, 3.86 GPA')).toBe('a 69,918-row set in 2026, 3.86 GPA');
  });
});
