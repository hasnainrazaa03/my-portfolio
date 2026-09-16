import { PROJECTS, PERSONAL_INFO, EDUCATION, EXPERIENCE } from '../constants';
import type { Project } from '../types/content';
import { projectPath, toSlug } from './slug';

/**
 * routeMeta.ts — the <head> each stand-alone route deserves.
 *
 * WHY: this is a single-page app, so every route used to be served the ONE
 * index.html. Its <title>, description, Open Graph tags and — worst — its
 * canonical link all described the home page. Shared on LinkedIn, a case
 * study previewed as the portfolio; to a crawler, every /projects/<slug> URL
 * in the sitemap declared itself a duplicate of "/", which is a request not to
 * index it. The client sets document.title later, but social scrapers and
 * most indexing passes never run the script.
 *
 * scripts/routeHeads.js turns this list into one HTML file per route at
 * build time — a copy of the built index.html with these values swapped in.
 * The list is derived from constants.ts so a new project gets its page and
 * its head without anyone remembering to add them.
 */

/** Canonical origin of the deployed site. Mirrored in scripts/buildSitemap.js, which is plain Node and cannot import TS. */
export const SITE_ORIGIN = 'https://hasnainrazaa.vercel.app';

export interface RouteHead {
  /** Pathname, no trailing slash. */
  path: string;
  title: string;
  description: string;
  /** `article` for a case study, `website` for everything else. */
  type: 'website' | 'article';
  /**
   * Keep out of search results: emits `robots: noindex` in place of the
   * canonical link. For private pages that still need a real file so the URL
   * answers 200 rather than falling to the 404 shell.
   */
  noindex?: boolean;
  /** Public path of a candidate social image ("/peakroutine-app.jpg"); the build decides if it is usable. */
  image?: string;
  /**
   * Public path of the card generated for this route
   * (`scripts/buildOgCards.js`), used when `image` is the wrong shape to crop
   * to 1.91:1. The build falls back to the site card if the file is absent, so
   * naming it here is safe before it has been generated.
   */
  generatedCard?: string;
  imageAlt?: string;
  /**
   * schema.org JSON-LD for this page, written into its <head> as a data
   * block. Browsers do not run CSP's script-src check on data blocks (checked
   * in Chromium: no violation, no report), so these carry no pinned hash.
   */
  structuredData?: Record<string, unknown>;
}

/**
 * What a case study IS, for a search engine: the work itself and where it
 * sits on the site.
 *
 * A project with public source is SoftwareSourceCode, pointing at the
 * repository; research without one is a CreativeWork. Only fields the page
 * itself shows are included: a rich result must not promise what the page
 * does not say.
 */
export function projectStructuredData(p: Project, origin = SITE_ORIGIN): Record<string, unknown> {
  const url = `${origin}${projectPath(p.title)}`;
  const github = p.links?.github ?? null;
  const work: Record<string, unknown> = {
    '@type': github ? 'SoftwareSourceCode' : 'CreativeWork',
    '@id': `${url}#work`,
    name: p.title,
    headline: p.title,
    description: p.description,
    abstract: p.longDescription,
    url,
    mainEntityOfPage: url,
    genre: p.category,
    creativeWorkStatus: p.status,
    keywords: p.techStack.join(', '),
    author: { '@type': 'Person', name: PERSONAL_INFO.name, url: origin },
  };
  if (p.images?.[0]) work.image = `${origin}${p.images[0]}`;
  if (github) work.codeRepository = github;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      work,
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: PERSONAL_INFO.name, item: `${origin}/` },
          { '@type': 'ListItem', position: 2, name: p.title, item: url },
        ],
      },
    ],
  };
}

/** Descriptions past ~160 characters are cut off in results; clip at a word rather than mid-token. */
export function clip(text: string, max = 200): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  const head = t.slice(0, max - 1);
  const atWord = head.lastIndexOf(' ');
  return `${head.slice(0, atWord > max - 40 ? atWord : head.length)}…`;
}

export function routeHeads(): RouteHead[] {
  const name = PERSONAL_INFO.name;
  const [primary] = EDUCATION;
  const companies = EXPERIENCE.slice(0, 3).map((e) => e.company);

  return [
    {
      path: '/resume',
      // Matches the title ResumePage sets once it mounts.
      title: `${name} — Resume`,
      description: clip(
        `Résumé of ${name}: ${primary.degree} at ${primary.school}, with experience at ${companies.join(', ')}. Printable, one page.`,
      ),
      type: 'website',
    },
    {
      path: '/fit',
      title: `Compare a role | ${name}`,
      description: clip(
        `Paste a job description and see what ${name}'s record actually supports, what it does not, and the work behind every claim.`,
      ),
      type: 'website',
    },
    {
      path: '/insights',
      title: `Visitor insights | ${name}`,
      description: 'Private visitor analytics for the site owner. Nothing loads without a token.',
      type: 'website',
      noindex: true,
    },
    {
      path: '/lab/flow',
      title: `Flow solver | ${name}`,
      description: 'A lattice-Boltzmann flow solver around a NACA 4412 airfoil, running in your browser: change the speed, viscosity and angle and watch the flow separate and shed vortices.',
      type: 'website',
    },
    {
      path: '/privacy',
      title: `Privacy Notice | ${name}`,
      // The page's own TL;DR, verbatim — a description must not promise more than the page says.
      description:
        'This site does not use third-party trackers, advertising cookies, or behavioural analytics, and does not sell or share personal data.',
      type: 'website',
    },
    ...PROJECTS.map((p): RouteHead => ({
      path: projectPath(p.title),
      // Matches the title ProjectDetailPage sets once it mounts.
      title: `${p.title} | ${name}`,
      description: clip(p.description),
      type: 'article',
      image: p.images?.[0],
      generatedCard: `/og/${toSlug(p.title)}.jpg`,
      imageAlt: `${p.title} screenshot`,
      structuredData: projectStructuredData(p),
    })),
  ];
}
