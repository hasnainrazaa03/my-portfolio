/**
 * chatService.test.js
 * ---------------------------------------------------------------------------
 * Scaffold — fill in once `vitest` is installed (`npm i -D vitest`).
 *
 * Run:  npm test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Un-comment the line below once vitest + happy-dom / jsdom is configured:
// import { getChatResponse, getLocalResponse } from '../services/chatService';

describe('chatService', () => {
  describe('getLocalResponse', () => {
    it.todo('returns a greeting for "hello"');
    it.todo('returns project info when input contains "project"');
    it.todo('returns skills info when input contains "skill"');
    it.todo('returns fallback for unrecognised input');
  });

  describe('getChatResponse', () => {
    it.todo('returns local response on network error');
    it.todo('returns friendly message when server flags the input');
    it.todo('returns reply from server on success');
  });
});
