/**
 * chatDemo.test.js
 * ---------------------------------------------------------------------------
 * Verifies demo messages structure and that demo data is valid.
 *
 * Run:  npm test
 */
import { describe, it, expect } from 'vitest';
import demoMessages from '../data/chatDemo.json';

describe('ChatDemo — demo conversation data', () => {
  it('should have at least 4 demo messages', () => {
    expect(demoMessages.length).toBeGreaterThanOrEqual(4);
  });

  it('every message should have role and content', () => {
    demoMessages.forEach((msg, idx) => {
      expect(msg).toHaveProperty('role');
      expect(msg).toHaveProperty('content');
      expect(['user', 'assistant']).toContain(msg.role);
      expect(typeof msg.content).toBe('string');
      expect(msg.content.length).toBeGreaterThan(0);
    });
  });

  it('should alternate between user and assistant messages', () => {
    for (let i = 0; i < demoMessages.length; i++) {
      const expected = i % 2 === 0 ? 'user' : 'assistant';
      expect(demoMessages[i].role).toBe(expected);
    }
  });

  it('assistant messages should be in first-person (no "Jarvis" or third-person)', () => {
    const bannedPatterns = [/\bJarvis\b/i, /\bHasnain's\b/, /\bhe built\b/i];
    demoMessages
      .filter(m => m.role === 'assistant')
      .forEach(m => {
        bannedPatterns.forEach(p => {
          expect(p.test(m.content)).toBe(false);
        });
      });
  });

  it('demo does NOT require network calls (data is static JSON)', () => {
    // This is a structural assertion — demo data is imported statically
    expect(Array.isArray(demoMessages)).toBe(true);
  });
});
