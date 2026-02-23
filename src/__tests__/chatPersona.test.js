/**
 * chatPersona.test.js
 * ---------------------------------------------------------------------------
 * Verifies that all chat responses use first-person Hasnain voice,
 * not third-person "Jarvis" / "Hasnain's" language.
 *
 * Run:  npm test
 */
import { describe, it, expect } from 'vitest';
import qnaFile from '../data/jarvisQnA.json';

const qna = qnaFile.qaData;

// Patterns that should NOT appear in first-person responses
const THIRD_PERSON_PATTERNS = [
  /\bJarvis\b/i,
  /\bHasnain's\b/,
  /\bHasnain has\b/i,
  /\bHasnain is\b/i,
  /\bhe built\b/i,
  /\bhis projects?\b/i,
  /\bhis experience\b/i,
];

describe('Chat Persona — First-Person Voice', () => {
  describe('jarvisQnA.json', () => {
    it('should not contain third-person references in any answer', () => {
      const violations = [];
      qna.forEach(({ q, a }) => {
        THIRD_PERSON_PATTERNS.forEach((pat) => {
          if (pat.test(a)) {
            violations.push(`Q: "${q}" — answer matches banned pattern ${pat}`);
          }
        });
      });
      expect(violations).toEqual([]);
    });

    it('should have at least 20 QnA pairs', () => {
      expect(qna.length).toBeGreaterThanOrEqual(20);
    });

    it('every answer should start with a capital letter or emoji', () => {
      qna.forEach(({ a }) => {
        expect(a).toMatch(/^[A-Z\u{1F000}-\u{1FFFF}]/u);
      });
    });
  });
});
