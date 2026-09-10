/**
 * ogCards.test.js — a shared project link must preview as that project.
 *
 * `og:image` decides what a timeline renders. A project's own artwork is the
 * best card when it crops to 1.91:1, but three projects here ship artwork that
 * does not — a 3.6:1 banner loses its sides, a 331x383 thumbnail renders as a
 * stamp — and those used to fall back to the site-wide card. Three different
 * links then previewed identically and told the reader nothing.
 *
 * `scripts/buildOgCards.js` renders a titled card for exactly those. The cards
 * are committed (rendering needs a browser, which Vercel's build does not
 * have), so the risk is staleness: rename a project and the card still says
 * the old name. `--check` compares a fingerprint of the inputs and runs in CI.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  cardsToGenerate,
  fingerprint,
  staleness,
  cardHtml,
  TEMPLATE_VERSION,
  CARD_FORMAT,
  CARD_WIDTH,
  CARD_HEIGHT,
  SITE_HOST,
} from '../../scripts/buildOgCards.js';
import { imageWorksAsCard, imageSize } from '../../scripts/routeHeads.js';
import { routeHeads, SITE_ORIGIN } from '../utils/routeMeta';
import { toSlug } from '../utils/slug';
import { PROJECTS } from '../constants';

const root = process.cwd();
const PUBLIC = resolve(root, 'public');
const cards = cardsToGenerate(PUBLIC);
const manifest = JSON.parse(readFileSync(resolve(PUBLIC, 'og/manifest.json'), 'utf8'));

describe('which projects get a generated card', () => {
  it('picks exactly those whose own artwork cannot serve as one', () => {
    const expected = PROJECTS.filter((p) => !imageWorksAsCard(PUBLIC, p.images?.[0])).map((p) => toSlug(p.title));
    expect(cards.map((c) => c.slug)).toEqual(expected);
  });

  it('leaves projects with usable artwork alone', () => {
    // PeakRoutine ships 1200x630 product art — a real screenshot beats any
    // generated panel, so it must NOT be in the list.
    const peak = PROJECTS.find((p) => p.title.startsWith('PeakRoutine'));
    expect(imageWorksAsCard(PUBLIC, peak.images[0])).toBe(true);
    expect(cards.some((c) => c.slug === toSlug(peak.title))).toBe(false);
  });

  it('generates at least one, or this whole mechanism is dead code', () => {
    expect(cards.length).toBeGreaterThan(0);
  });
});

describe('the committed cards', () => {
  it.each(cards.map((c) => [c.slug, c]))('%s exists, is the right format and size', (slug, card) => {
    const file = resolve(PUBLIC, `og/${slug}.${CARD_FORMAT.ext}`);
    expect(existsSync(file), `${file} missing — run npm run og:build`).toBe(true);
    const buf = readFileSync(file);
    expect(imageSize(buf)).toEqual({ width: CARD_WIDTH, height: CARD_HEIGHT });
    // 1.91:1 is what every scraper crops to; 1200x630 is the canonical size.
    expect(CARD_WIDTH / CARD_HEIGHT).toBeCloseTo(1.9, 1);
    expect(statSync(file).size).toBeLessThan(150 * 1024);
    expect(manifest.cards[slug], `${slug} not in the manifest`).toBe(fingerprint(card));
  });

  it('the manifest records the template version that produced them', () => {
    expect(manifest.templateVersion).toBe(TEMPLATE_VERSION);
  });

  it('is current — the same thing CI asserts', () => {
    const { missing, changed, orphaned } = staleness(cards, manifest);
    expect({ missing, changed, orphaned }).toEqual({ missing: [], changed: [], orphaned: [] });
  });
});

describe('staleness detection', () => {
  const card = cards[0];

  it('notices a renamed project', () => {
    const renamed = { ...card, title: `${card.title} v2` };
    expect(fingerprint(renamed)).not.toBe(fingerprint(card));
    expect(staleness([renamed], manifest).changed).toEqual([renamed.slug]);
  });

  it('notices a reordered tech stack, which changes what the card shows', () => {
    // Only the first five chips are rendered, so order is a visible input.
    const reordered = { ...card, tech: [...card.tech].reverse() };
    expect(fingerprint(reordered)).not.toBe(fingerprint(card));
  });

  it('notices a card for a project that no longer exists', () => {
    expect(staleness(cards, { cards: { ...manifest.cards, 'deleted-project': 'abc' } }).orphaned)
      .toEqual(['deleted-project']);
  });

  it('notices a template change without any content change', () => {
    // TEMPLATE_VERSION is part of the fingerprint precisely so a layout edit
    // does not leave every card rendered by the old one.
    expect(fingerprint(card)).not.toBe(
      fingerprint({ ...card, __v: 'different' }),
    );
  });
});

describe('the card template', () => {
  const html = cardHtml({
    title: 'A & B <script>alert(1)</script>',
    category: 'AI/ML',
    tech: ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven'],
    name: 'Hasnain Raza',
    site: SITE_HOST,
    fontDataUri: 'data:font/woff2;base64,AAAA',
  });

  it('escapes content — project titles are interpolated into markup', () => {
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('A &amp; B');
  });

  it('renders at most five tech chips, so a long stack cannot overflow', () => {
    expect((html.match(/<li>/g) ?? []).length).toBe(5);
    expect(html).not.toContain('<li>Six</li>');
  });

  it('embeds the font rather than fetching it, so rendering needs no network', () => {
    expect(html).toContain('data:font/woff2;base64,');
    expect(html).not.toMatch(/https?:\/\/fonts\./);
  });

  it('is sized exactly for a social card', () => {
    expect(html).toContain(`width:${CARD_WIDTH}px`);
    expect(html).toContain(`height:${CARD_HEIGHT}px`);
  });
});

describe('the head generator uses them', () => {
  it('points every generated-card project at its file', () => {
    const heads = routeHeads();
    for (const card of cards) {
      const head = heads.find((h) => h.path === `/projects/${card.slug}`);
      expect(head, `no head for ${card.slug}`).toBeTruthy();
      expect(head.generatedCard).toBe(`/og/${card.slug}.${CARD_FORMAT.ext}`);
    }
  });

  it('names the same host the cards are stamped with', () => {
    expect(SITE_ORIGIN).toContain(SITE_HOST);
  });
});
