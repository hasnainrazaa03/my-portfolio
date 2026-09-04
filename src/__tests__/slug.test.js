/**
 * slug.test.js — project URLs are public and permanent.
 *
 * Once /projects/project-vimaan is shared, that URL has to keep working. These
 * pin the mapping so a title edit that would silently change a live URL fails
 * here instead of breaking the link.
 */
import { describe, it, expect } from 'vitest';
import { toSlug, projectPath, parseProjectPath } from '../utils/slug';
import { PROJECTS } from '../constants';

describe('toSlug', () => {
  it.each([
    ['Project Vimaan', 'project-vimaan'],
    ['PeakRoutine - AI Health & Wellness Platform', 'peakroutine-ai-health-and-wellness-platform'],
    ['Brain Tumor Segmentation (BraTS 2021 - Vision Transformer)', 'brain-tumor-segmentation-brats-2021-vision-transformer'],
    ['RVSAT-1 (Team Antariksh)', 'rvsat-1-team-antariksh'],
    ['USC Ledger', 'usc-ledger'],
  ])('%s -> %s', (title, slug) => {
    expect(toSlug(title)).toBe(slug);
  });

  it('expands & rather than dropping it, so "R&D" cannot collide with "RD"', () => {
    expect(toSlug('R&D')).toBe('r-and-d');
    expect(toSlug('RD')).toBe('rd');
  });

  it('strips diacritics so one title cannot yield two URLs', () => {
    expect(toSlug('Résumé Tool')).toBe('resume-tool');
  });

  it('never leaves a leading or trailing hyphen', () => {
    expect(toSlug('  — Leading and trailing —  ')).not.toMatch(/^-|-$/);
  });

  it('handles empty and nullish input', () => {
    expect(toSlug('')).toBe('');
    expect(toSlug(undefined)).toBe('');
  });
});

describe('every real project', () => {
  it('produces a non-empty slug', () => {
    for (const p of PROJECTS) expect(toSlug(p.title), p.title).not.toBe('');
  });

  it('produces a UNIQUE slug — a collision would make one project unreachable', () => {
    const slugs = PROJECTS.map((p) => toSlug(p.title));
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('round-trips through the path parser', () => {
    for (const p of PROJECTS) {
      expect(parseProjectPath(projectPath(p.title))).toBe(toSlug(p.title));
    }
  });
});

describe('parseProjectPath', () => {
  it('accepts a trailing slash, as the rest of the routing does', () => {
    expect(parseProjectPath('/projects/usc-ledger/')).toBe('usc-ledger');
  });

  it('rejects non-project paths', () => {
    for (const p of ['/', '/resume', '/privacy', '/projects', '/projects/a/b']) {
      expect(parseProjectPath(p), p).toBeNull();
    }
  });

  it('lowercases so a shared link with odd casing still resolves', () => {
    expect(parseProjectPath('/projects/USC-Ledger')).toBe('usc-ledger');
  });
});
