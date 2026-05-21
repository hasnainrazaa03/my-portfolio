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

const getSynth = () =>
  (typeof window !== 'undefined' && 'speechSynthesis' in window)
    ? window.speechSynthesis
    : null;

export const useSpeechSynthesis = ({ lang = 'en-US', rate = 1, pitch = 1 } = {}) => {
  const synth = getSynth();
  const supported = Boolean(synth);
  const [speaking, setSpeaking] = useState(false);
  const currentUtterRef = useRef(null);

  // Stop any in-flight speech if the component using this hook unmounts.
  useEffect(() => {
    if (!supported) return undefined;
    return () => {
      try { synth.cancel(); } catch { /* no-op */ }
    };
  }, [supported, synth]);

  const speak = useCallback((text) => {
    if (!supported || typeof text !== 'string' || !text.trim()) return;
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
  }, [supported, synth, lang, rate, pitch]);

  const cancel = useCallback(() => {
    if (!supported) return;
    try { synth.cancel(); } catch { /* no-op */ }
    setSpeaking(false);
  }, [supported, synth]);

  return { supported, speaking, speak, cancel };
};

export default useSpeechSynthesis;
