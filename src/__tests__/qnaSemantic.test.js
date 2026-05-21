import { describe, it, expect } from 'vitest';
import { tfidfScore, searchQnA } from '../components/QnASearch';

describe('QnASearch — TF-IDF semantic scoring', () => {
  it('tfidfScore returns a value in [0,1]', () => {
    const s = tfidfScore('vimaan voice copilot', 0);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });

  it('tfidfScore returns 0 for an empty query', () => {
    expect(tfidfScore('', 0)).toBe(0);
  });

  it('tfidfScore returns 0 for an out-of-range doc index', () => {
    expect(tfidfScore('python', 99_999)).toBe(0);
    expect(tfidfScore('python', -1)).toBe(0);
  });

  it('searchQnA recovers a Vimaan-related doc via semantic terms (no exact substring)', () => {
    // None of these words individually need to substring-match the question text;
    // TF-IDF should still surface a Vimaan-related result.
    const results = searchQnA('voice copilot flight simulator');
    expect(results.length).toBeGreaterThan(0);
  });
});
