import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Thin wrapper around the Web Speech Recognition API.
 *
 * Returns a `supported` flag (false on Firefox/Safari-old/SSR) so callers can
 * hide UI when the API is missing. Errors and end events always flip
 * `listening` back to false so the UI doesn't get stuck.
 *
 * Privacy note: speech recognition on Chrome routes audio through Google's
 * servers. We surface this in the chatbot UI via the button's title attribute.
 */
const getRecognitionCtor = () => {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

export const useSpeechRecognition = ({ lang = 'en-US', onResult } = {}) => {
  const Ctor = getRecognitionCtor();
  const supported = Boolean(Ctor);
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!supported) return undefined;
    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;

    rec.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      if (transcript && typeof onResult === 'function') onResult(transcript);
    };
    rec.onerror = (event) => {
      setError(event.error || 'speech-error');
      setListening(false);
    };
    rec.onend = () => setListening(false);

    recognitionRef.current = rec;
    return () => {
      try { rec.abort(); } catch { /* no-op */ }
      recognitionRef.current = null;
    };
  }, [Ctor, lang, onResult, supported]);

  const start = useCallback(() => {
    if (!recognitionRef.current || listening) return;
    setError(null);
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch (e) {
      // `start()` throws if already started; surface but keep state consistent.
      setError(e?.message || 'start-failed');
      setListening(false);
    }
  }, [listening]);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    try { recognitionRef.current.stop(); } catch { /* no-op */ }
  }, []);

  return { supported, listening, error, start, stop };
};

export default useSpeechRecognition;
