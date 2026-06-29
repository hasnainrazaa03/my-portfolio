/**
 * Thin wrapper around the Web SpeechSynthesis API.
 *
 * - `supported` is false on SSR and in browsers without speechSynthesis.
 * - `speak(text)` cancels any in-flight utterance before queueing a new one
 *   so back-to-back assistant replies don't pile up.
 * - `cancel()` stops everything (e.g. when the chatbot closes or the user
 *   toggles TTS off mid-utterance).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseSpeechSynthesisOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
}

export interface UseSpeechSynthesisResult {
  supported: boolean;
  speaking: boolean;
  speak: (text: string) => void;
  cancel: () => void;
}

const getSynth = (): SpeechSynthesis | null =>
  (typeof window !== 'undefined' && 'speechSynthesis' in window)
    ? window.speechSynthesis
    : null;

export const useSpeechSynthesis = (
  { lang = 'en-US', rate = 1, pitch = 1 }: UseSpeechSynthesisOptions = {},
): UseSpeechSynthesisResult => {
  const synth = getSynth();
  const supported = Boolean(synth);
  const [speaking, setSpeaking] = useState(false);
  const currentUtterRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Stop any in-flight speech if the component using this hook unmounts.
  useEffect(() => {
    if (!synth) return undefined;
    return () => {
      try { synth.cancel(); } catch { /* no-op */ }
    };
  }, [synth]);

  const speak = useCallback((text: string) => {
    if (!synth || typeof text !== 'string' || !text.trim()) return;
    try {
      // Cancel anything currently playing — avoids overlap when the chat
      // produces messages faster than they can be read aloud.
      synth.cancel();
      const utter = new window.SpeechSynthesisUtterance(text);
      utter.lang = lang;
      utter.rate = rate;
      utter.pitch = pitch;
      utter.onend = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);
      currentUtterRef.current = utter;
      setSpeaking(true);
      synth.speak(utter);
    } catch {
      setSpeaking(false);
    }
  }, [synth, lang, rate, pitch]);

  const cancel = useCallback(() => {
    if (!synth) return;
    try { synth.cancel(); } catch { /* no-op */ }
    setSpeaking(false);
  }, [synth]);

  return { supported, speaking, speak, cancel };
};

export default useSpeechSynthesis;
