/**
 * useSpeechRecognition.test.js
 * ---------------------------------------------------------------------------
 * Verifies the hook gracefully degrades when the Web Speech API is missing,
 * which is the only behaviour we can usefully assert in jsdom (jsdom does
 * not implement SpeechRecognition).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

describe('useSpeechRecognition', () => {
  const originalWindow = { SR: window.SpeechRecognition, wSR: window.webkitSpeechRecognition };

  beforeEach(() => {
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
  });
  afterEach(() => {
    if (originalWindow.SR) window.SpeechRecognition = originalWindow.SR;
    if (originalWindow.wSR) window.webkitSpeechRecognition = originalWindow.wSR;
  });

  it('reports unsupported when the API is missing', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.supported).toBe(false);
    expect(result.current.listening).toBe(false);
  });

  it('start() and stop() are no-ops when unsupported (do not throw)', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    expect(() => result.current.start()).not.toThrow();
    expect(() => result.current.stop()).not.toThrow();
    expect(result.current.listening).toBe(false);
  });

  it('reports supported when a SpeechRecognition shim is present', () => {
    // Minimal shim: just enough surface for the hook to attach handlers.
    class FakeRecognition {
      constructor() { this.lang = ''; this.continuous = false; }
      start() {}
      stop() {}
      abort() {}
    }
    window.SpeechRecognition = FakeRecognition;
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.supported).toBe(true);
  });
});
