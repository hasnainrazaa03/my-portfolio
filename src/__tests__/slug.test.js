/**
 * slug.test.js — project URLs are public and permanent.
 *
 * Once /projects/project-vimaan is shared, that URL has to keep working. These
 * pin the mapping so a title edit that would silently change a live URL fails
 * here instead of breaking the link.
 */
import { describe, it, expect } from 'vitest';
import { toSlug, projectPath, parseProjectPath, canonicalProjectPath } from '../utils/slug';
import { PROJECTS } from '../constants';

describe('toSlug', () => {
  /**
   * EVERY live project URL, pinned. Five of the nine used to be listed, so
   * renaming any of the other four changed a public URL with the whole suite
   * still green — `sitemap:check` and `og:check` would only have said
   * "regenerate", not "you just retired a link somebody shared".
   *
   * If one of these fails, the title changed. Decide deliberately: keep the
   * old URL, or accept the new one and add a redirect for the old.
   */
  it.each([
    ['PeakRoutine - AI Health & Wellness Platform', 'peakroutine-ai-health-and-wellness-platform'],
    ['Project Vimaan', 'project-vimaan'],
    ['Numerical Investigation of Store Separation from a Rectangular Cavity', 'numerical-investigation-of-store-separation-from-a-rectangular-cavity'],
    ['Manzil Recipe Vault', 'manzil-recipe-vault'],
    ['USC Ledger', 'usc-ledger'],
    ['Numerical Investigation of Vortex Influence on NACA 4412 Airfoil', 'numerical-investigation-of-vortex-influence-on-naca-4412-airfoil'],
    ['Brain Tumor Segmentation (BraTS 2021 - Vision Transformer)', 'brain-tumor-segmentation-brats-2021-vision-transformer'],
    ['RVSAT-1 (Team Antariksh)', 'rvsat-1-team-antariksh'],
    ['ReSOLV-1 (Team Antariksh)', 'resolv-1-team-antariksh'],
  ])('%s -> %s', (title, slug) => {
    expect(toSlug(title)).toBe(slug);
  });

  it('pins every project that exists — a new one must be added above', () => {
    // Without this the list silently stops covering the set it claims to.
    const pinned = new Set([
      'peakroutine-ai-health-and-wellness-platform', 'project-vimaan',
      'numerical-investigation-of-store-separation-from-a-rectangular-cavity',
      'manzil-recipe-vault', 'usc-ledger',
      'numerical-investigation-of-vortex-influence-on-naca-4412-airfoil',
      'brain-tumor-segmentation-brats-2021-vision-transformer',
      'rvsat-1-team-antariksh', 'resolv-1-team-antariksh',
    ]);
    const unpinned = PROJECTS.map((p) => toSlug(p.title)).filter((s) => !pinned.has(s));
    expect(unpinned, `add these to the table above: ${unpinned.join(', ')}`).toEqual([]);
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

describe('non-canonical project URLs', () => {
  /**
   * Only the lowercase, unescaped slug exists as a file in the build, so any
   * other spelling is served by the 404 shell. Two opposite failures came from
   * that: /projects/USC-Ledger rendered the full case study while the host
   * answered 404 (dead to every crawler, unfurl and link checker), and
   * /projects/usc%2Dledger was answered 200 with the right head and then
   * rendered "that project doesn't exist" by the app.
   */
  it('decodes percent-escapes the host has already normalised away', () => {
    expect(parseProjectPath('/projects/usc%2Dledger')).toBe('usc-ledger');
    expect(parseProjectPath('/projects/project%20vimaan')).toBe('project vimaan');
  });

  it('survives a malformed escape instead of throwing during render', () => {
    expect(() => parseProjectPath('/projects/%zz')).not.toThrow();
    expect(parseProjectPath('/projects/%zz')).toBe('%zz');
  });

  it('reports the canonical path for a URL that is not one', () => {
    expect(canonicalProjectPath('/projects/USC-Ledger')).toBe('/projects/usc-ledger');
    expect(canonicalProjectPath('/projects/usc%2Dledger')).toBe('/projects/usc-ledger');
    expect(canonicalProjectPath('/projects/usc-ledger/')).toBe('/projects/usc-ledger');
  });

  it('reports null when the URL already IS canonical, so there is no redirect loop', () => {
    for (const p of PROJECTS) {
      expect(canonicalProjectPath(projectPath(p.title)), p.title).toBeNull();
    }
  });

  it('reports null for anything that is not a project URL', () => {
    for (const p of ['/', '/resume', '/projects', '/projects/a/b']) {
      expect(canonicalProjectPath(p), p).toBeNull();
    }
  });
});
