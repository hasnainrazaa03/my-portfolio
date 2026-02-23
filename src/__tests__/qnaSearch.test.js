/**
 * qnaSearch.test.js
 * ---------------------------------------------------------------------------
 * Tests fuzzy matching, ranking, and threshold logic for the local Q&A search.
 *
 * Run:  npm test
 */
import { describe, it, expect } from 'vitest';
import { fuzzyScore, searchQnA, AUTO_SUGGEST_THRESHOLD } from '../components/QnASearch';

describe('QnASearch — fuzzy matching', () => {
  describe('fuzzyScore', () => {
    it('returns 1 for exact substring match', () => {
      expect(fuzzyScore('vimaan', 'What is Project Vimaan?')).toBe(1);
    });

    it('returns > 0 for partial token overlap', () => {
      const score = fuzzyScore('ML frameworks', 'What ML frameworks do you use?');
      expect(score).toBeGreaterThan(0);
    });

    it('returns 0 for completely unrelated strings', () => {
      expect(fuzzyScore('xyzzy foobar', 'What is Project Vimaan?')).toBe(0);
    });

    it('returns 0 for empty query', () => {
      expect(fuzzyScore('', 'some target')).toBe(0);
    });

    it('returns 0 for empty target', () => {
      expect(fuzzyScore('query', '')).toBe(0);
    });

    it('is case-insensitive', () => {
      expect(fuzzyScore('VIMAAN', 'what is project vimaan?')).toBe(1);
    });
  });

  describe('searchQnA', () => {
    it('returns results for a known question keyword', () => {
      const results = searchQnA('Vimaan');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].q.toLowerCase()).toContain('vimaan');
    });

    it('returns top match with score >= threshold for exact question', () => {
      const results = searchQnA('What is Project Vimaan?');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].score).toBeGreaterThanOrEqual(AUTO_SUGGEST_THRESHOLD);
    });

    it('returns empty array for very short query', () => {
      expect(searchQnA('a')).toEqual([]);
    });

    it('returns empty array for empty query', () => {
      expect(searchQnA('')).toEqual([]);
    });

    it('returns at most 5 results by default', () => {
      const results = searchQnA('experience project skill');
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('ranks exact match higher than fuzzy match', () => {
      const results = searchQnA('Deloitte');
      expect(results.length).toBeGreaterThan(0);
      // The result mentioning Deloitte in the question should be first
      expect(results[0].q.toLowerCase()).toContain('deloitte');
    });

    it('scores are between 0 and 1', () => {
      const results = searchQnA('python');
      results.forEach(r => {
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('AUTO_SUGGEST_THRESHOLD', () => {
    it('is a number between 0 and 1', () => {
      expect(AUTO_SUGGEST_THRESHOLD).toBeGreaterThan(0);
      expect(AUTO_SUGGEST_THRESHOLD).toBeLessThanOrEqual(1);
    });
  });
});
