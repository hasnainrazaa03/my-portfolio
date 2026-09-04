/**
 * projectDetail.test.jsx — routable case-study pages.
 *
 * The modal has no URL. A recruiter forwarding "look at this one" had nothing
 * to send, and a search engine had nothing to index. These pages are the
 * shareable form, so what matters is that a link RESOLVES and that a stale one
 * degrades gracefully rather than rendering an empty shell.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProjectDetailPage from '../components/ProjectDetailPage';
import { PROJECTS } from '../constants';
import { toSlug } from '../utils/slug';
import { buildSitemap, projectTitles, toSlug as sitemapSlug } from '../../scripts/buildSitemap.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const first = PROJECTS[0];

describe('a resolvable project link', () => {
  it('renders the project it names', () => {
    render(<ProjectDetailPage slug={toSlug(first.title)} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(first.title);
  });

  it('sets a document title a search result can use', () => {
    render(<ProjectDetailPage slug={toSlug(first.title)} />);
    expect(document.title).toContain(first.title);
  });

  it('shows the tech stack', () => {
    render(<ProjectDetailPage slug={toSlug(first.title)} />);
    for (const tech of first.techStack.slice(0, 3)) {
      expect(screen.getByText(tech)).toBeInTheDocument();
    }
  });

  it('offers a way back to the grid', () => {
    render(<ProjectDetailPage slug={toSlug(first.title)} />);
    expect(screen.getByRole('link', { name: /back to all projects/i })).toHaveAttribute(
      'href',
      '/#projects',
    );
  });

  it('renders every project without throwing', () => {
    for (const p of PROJECTS) {
      const { unmount } = render(<ProjectDetailPage slug={toSlug(p.title)} />);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(p.title);
      unmount();
    }
  });
});

describe('a stale link', () => {
  it('explains itself instead of rendering an empty page', () => {
    render(<ProjectDetailPage slug="a-project-that-was-renamed" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/doesn.t exist/i);
    expect(screen.getByRole('link', { name: /see all projects/i })).toBeInTheDocument();
  });
});

describe('sitemap stays in step with the routes', () => {
  const constants = readFileSync(resolve(process.cwd(), 'src/constants.ts'), 'utf8');

  it('derives the same slugs as the app', () => {
    // The sitemap script cannot import the TS util, so it mirrors it. If the
    // two ever diverge, every project URL in the sitemap 404s.
    for (const p of PROJECTS) expect(sitemapSlug(p.title)).toBe(toSlug(p.title));
  });

  it('finds every project title in constants.ts', () => {
    expect(projectTitles(constants).sort()).toEqual(PROJECTS.map((p) => p.title).sort());
  });

  it('the committed sitemap lists every project', () => {
    const xml = readFileSync(resolve(process.cwd(), 'public/sitemap.xml'), 'utf8');
    for (const p of PROJECTS) {
      expect(xml, `sitemap missing ${p.title}`).toContain(`/projects/${toSlug(p.title)}`);
    }
  });

  it('produces valid, well-formed XML', () => {
    const xml = buildSitemap(['A Project'], '2026-01-01');
    expect(xml.startsWith('<?xml')).toBe(true);
    expect((xml.match(/<url>/g) || []).length).toBe((xml.match(/<\/url>/g) || []).length);
  });
});
