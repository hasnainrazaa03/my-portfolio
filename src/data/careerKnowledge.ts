/**
 * careerKnowledge.ts — render the vetted career corpus for the system prompt.
 *
 * The source is `careerKnowledge.generated.ts`, derived by
 * `scripts/buildCareerKnowledge.js` from private master documents that never
 * enter this repo. See that script for why the corpus is curated at build time
 * rather than retrieved at request time: the masters are ~390K tokens and about
 * half claim-boundary, so a retriever would happily surface a paragraph of
 * background context four lines above the sentence saying that paragraph must
 * never be claimed as personal work.
 *
 * Two things are rendered, and the second matters more than the first:
 *
 *   CLAIMS      — approved wording and figures, straight from each master's
 *                 claim-and-evidence registry.
 *   BOUNDARIES  — what must never be said. These include disclosure limits on
 *                 defence research (platform identity, classified
 *                 configurations and results) and phrasings the author has
 *                 explicitly retired. They are rendered FIRST and framed as
 *                 absolute, because a model that omits a claim is merely less
 *                 useful, while one that crosses a boundary is a liability.
 */
import { CAREER_CORPUS as corpus } from './careerKnowledge.generated';

interface Narrative {
  heading: string;
  text: string;
}
interface Claim {
  claim: string;
  value: string;
  safe: string;
  limits: string;
}
interface ExperienceKnowledge {
  name: string;
  narratives: Narrative[];
  claims: Claim[];
  prohibitions: string[];
}

const experiences = corpus.experiences as ExperienceKnowledge[];

/** Every boundary across every experience, de-duplicated. */
export function collectBoundaries(): string[] {
  const all = new Set<string>();
  for (const e of experiences) {
    for (const p of e.prohibitions) {
      // A boundary with nothing after the colon states no rule and only
      // dilutes the ones that do.
      if (!p || /:\s*$/.test(p)) continue;
      all.add(p);
    }
  }
  return [...all].sort();
}

/**
 * Render the corpus as plain text for the system prompt.
 *
 * @param maxNarratives how many narrative depths to include per experience.
 */
export function buildCareerBlock(maxNarratives = 3): string {
  const lines: string[] = [];

  lines.push('=== ABSOLUTE BOUNDARIES ===');
  lines.push(
    'These are non-negotiable. If a question cannot be answered without crossing one,',
    'say plainly that you cannot go into that detail and offer what you can discuss instead.',
    'Never infer around a boundary, and never repeat a figure that is not listed as approved below.',
    '',
  );
  for (const b of collectBoundaries()) lines.push(`- ${b}`);

  lines.push('');
  lines.push('=== VERIFIED CAREER DETAIL ===');
  lines.push(
    'Approved wording and figures. Anything not here is not established — say so',
    'rather than estimating.',
    '',
  );

  for (const e of experiences) {
    lines.push(`## ${e.name}`);

    for (const n of e.narratives.slice(0, maxNarratives)) {
      lines.push(`[${n.heading}] ${n.text}`);
    }

    for (const c of e.claims) {
      const wording = c.safe && c.safe.toLowerCase() !== 'state as-is' ? c.safe : c.value;
      if (!c.claim && !wording) continue;
      const limit = c.limits && c.limits !== '—' ? `  (limit: ${c.limits})` : '';
      lines.push(`- ${c.claim}: ${wording}${limit}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export const CAREER_EXPERIENCE_NAMES = experiences.map((e) => e.name);
