/**
 * claimIntegrity.test.js — published claims must survive "how did you measure that?"
 *
 * Every figure on this site traces to a claim-and-evidence registry kept with
 * the master documents outside this repo. The site had drifted from it: it
 * advertised a "10x throughput increase" that the registry classifies as a
 * capacity ratio rather than a measured rate, and which the canonical resumes
 * had already dropped. Nothing was comparing the two.
 *
 * Both published surfaces are checked — the site content AND the PDF the Hero
 * button hands a recruiter, since they drift independently.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PROHIBITED_CLAIMS } from '../data/claimRules';
import { extractPdfText } from '../../scripts/extractPdfText.js';

const constantsSrc = readFileSync(resolve(process.cwd(), 'src/constants.ts'), 'utf8');
const pdfText = extractPdfText(resolve(process.cwd(), 'public/resume.pdf'));

const report = (rule) => `${rule.reason}. Use instead: ${rule.instead}`;

describe('site content', () => {
  it.each(PROHIBITED_CLAIMS.map((r) => [r.pattern.source, r]))(
    'does not claim %s',
    (_src, rule) => {
      const match = constantsSrc.match(rule.pattern);
      expect(match, match ? `constants.ts says "${match[0]}" — ${report(rule)}` : '').toBeNull();
    },
  );
});

describe('downloadable résumé PDF', () => {
  it.each(PROHIBITED_CLAIMS.map((r) => [r.pattern.source, r]))(
    'does not claim %s',
    (_src, rule) => {
      const match = pdfText.match(rule.pattern);
      expect(
        match,
        match
          ? `public/resume.pdf says "${match[0]}" — ${report(rule)}. ` +
            'The canonical .tex sources are already correct; recompile and copy the PDF in.'
          : '',
      ).toBeNull();
    },
  );
});
