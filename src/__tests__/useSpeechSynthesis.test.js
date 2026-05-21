import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';

describe('useSpeechSynthesis', () => {
  let cancelMock;
  let speakMock;
  let utterInstances;

  beforeEach(() => {
    cancelMock = vi.fn();
    speakMock = vi.fn();
    utterInstances = [];

    // Minimal SpeechSynthesisUtterance shim that records construction args
    // and exposes the callbacks the hook attaches.
    class FakeUtterance {
      constructor(text) {
        this.text = text;
        this.onend = null;
        this.onerror = null;
        utterInstances.push(this);
      }
    }
    window.SpeechSynthesisUtterance = FakeUtterance;
    window.speechSynthesis = { cancel: cancelMock, speak: speakMock };
  });

  afterEach(() => {
    delete window.speechSynthesis;
    delete window.SpeechSynthesisUtterance;
  });

  it('reports supported = true when speechSynthesis exists', () => {
    const { result } = renderHook(() => useSpeechSynthesis());
    expect(result.current.supported).toBe(true);
    expect(result.current.speaking).toBe(false);
  });

  it('calls synth.speak with a configured utterance and flips speaking', () => {
    const { result } = renderHook(() =>
      useSpeechSynthesis({ lang: 'en-GB', rate: 1.2, pitch: 0.9 })
    );

    act(() => result.current.speak('hello world'));

    expect(cancelMock).toHaveBeenCalled();
    expect(speakMock).toHaveBeenCalledTimes(1);
    const utter = utterInstances.at(-1);
    expect(utter.text).toBe('hello world');
    expect(utter.lang).toBe('en-GB');
    expect(utter.rate).toBe(1.2);
    expect(utter.pitch).toBe(0.9);
    expect(result.current.speaking).toBe(true);

    // onend should clear the speaking flag.
    act(() => utter.onend?.());
    expect(result.current.speaking).toBe(false);
  });

  it('ignores empty / non-string input and exposes cancel()', () => {
    const { result } = renderHook(() => useSpeechSynthesis());

    act(() => result.current.speak(''));
    act(() => result.current.speak('   '));
    act(() => result.current.speak(null));
    expect(speakMock).not.toHaveBeenCalled();

    act(() => result.current.speak('something'));
    expect(speakMock).toHaveBeenCalledTimes(1);

    act(() => result.current.cancel());
    expect(cancelMock).toHaveBeenCalled();
    expect(result.current.speaking).toBe(false);
  });

  it('reports unsupported when speechSynthesis is missing', () => {
    delete window.speechSynthesis;
    const { result } = renderHook(() => useSpeechSynthesis());
    expect(result.current.supported).toBe(false);
    act(() => result.current.speak('nope'));
    expect(speakMock).not.toHaveBeenCalled();
  });
});
