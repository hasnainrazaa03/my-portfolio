/**
 * sourceLinks.test.js — "where can I read more" chips under chat answers.
 *
 * Derived server-side rather than emitted by the model: a model can invent an
 * anchor, and a link that scrolls nowhere is worse than no link. The most
 * important test here is the last one — every id must be a section that
 * actually exists in the rendered page.
 */
import { describe, it, expect } from 'vitest';
import { deriveSources, SOURCE_SECTION_IDS } from '../../api/_lib/sourceLinks';

const ids = (q, r, n) => deriveSources(q, r, n).map((s) => s.id);

describe('deriveSources', () => {
  it('cites Projects when the answer describes a project', () => {
    expect(ids('what have you built?', 'I built Project Vimaan, a drone platform.')).toContain('projects');
  });

  it('cites Education for a GPA answer', () => {
    expect(ids('what is your GPA?', "I'm holding a 4.0/4.0 GPA in my M.S. at USC.")).toContain('education');
  });

  it('cites Experience for a role answer', () => {
    expect(ids('where have you worked?', 'I interned at Deloitte on a data platform.')).toContain('experience');
  });

  it('cites Contact when the answer explains how to reach him', () => {
    expect(ids('how do I contact you?', 'The best way to reach me is by email.')).toContain('contact');
  });

  it('weights the ANSWER above the question', () => {
    // Asked broadly about building; answered about a role. Experience should
    // win, because what was said beats what was asked.
    const result = ids(
      'tell me what you have done',
      'I worked at DRDO on CFD simulations during that internship, in an aerospace role.',
    );
    expect(result[0]).toBe('experience');
  });

  it('ignores the "[Ask about: …]" affordance when scoring', () => {
    // The suffix names OTHER topics by design; scoring it would cite the
    // suggestions rather than the sections the answer actually drew on.
    const withSuffix = ids(
      'what is your GPA?',
      'I have a 4.0 GPA at USC. [Ask about: my projects or my github repos?]',
    );
    expect(withSuffix).toContain('education');
    expect(withSuffix).not.toContain('projects');
    expect(withSuffix).not.toContain('github');
  });

  it('returns nothing for a greeting — no link beats a wrong link', () => {
    expect(deriveSources('hi there', 'Hey! Glad you stopped by.')).toEqual([]);
  });

  it('returns nothing for an off-topic redirect', () => {
    expect(
      deriveSources("what's the weather?", "That's outside my wheelhouse."),
    ).toEqual([]);
  });

  it('caps the number of chips', () => {
    const many = 'I built projects at Deloitte using Python while studying at USC, see my github, email me.';
    expect(deriveSources(many, many)).toHaveLength(2);
    expect(deriveSources(many, many, 3)).toHaveLength(3);
  });

  it('orders by score, strongest first', () => {
    const result = deriveSources(
      'tell me about your degree',
      'I study at USC, my university, where my coursework and GPA are in my M.S. degree. I also built one project.',
    );
    expect(result[0].id).toBe('education');
  });

  it('returns a label for every link', () => {
    for (const s of deriveSources('projects', 'I built a project at Deloitte')) {
      expect(s.label).toBeTruthy();
      expect(typeof s.label).toBe('string');
    }
  });

  it('handles empty, null and undefined input', () => {
    expect(deriveSources('', '')).toEqual([]);
    expect(deriveSources(null, undefined)).toEqual([]);
  });

  it('handles limit 0', () => {
    expect(deriveSources('projects', 'I built a project', 0)).toEqual([]);
  });

  it('every cited id is a section that exists in the rendered page', async () => {
    // The whole feature is worthless if a chip scrolls nowhere. Cross-check the
    // rule table against the ids actually rendered by the app.
    const { readFileSync, readdirSync } = await import('node:fs');
    const { join, resolve } = await import('node:path');
    const dir = resolve(process.cwd(), 'src/components');
    const sources = readdirSync(dir)
      .filter((f) => /\.(tsx|jsx)$/.test(f))
      .map((f) => readFileSync(join(dir, f), 'utf8'))
      .join('\n');
    const appSrc = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const rendered = new Set(
      [...`${sources}\n${appSrc}`.matchAll(/id="([a-zA-Z-]+)"/g)].map((m) => m[1]),
    );

    const missing = SOURCE_SECTION_IDS.filter((id) => !rendered.has(id));
    expect(missing, `these section ids are cited but never rendered: ${missing}`).toEqual([]);
  });
});
