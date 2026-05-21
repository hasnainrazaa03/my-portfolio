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
  // Keep the latest onResult in a ref so the effect below does NOT re-run on
  // every render. Without this, callers that close over component state
  // (e.g. messages, persona) would cause us to abort + recreate the
  // SpeechRecognition instance on every keystroke, which silently breaks
  // start() and prevents the browser's mic-permission prompt from firing.
  const onResultRef = useRef(onResult);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);

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
      if (transcript && typeof onResultRef.current === 'function') {
        onResultRef.current(transcript);
      }
    };
    rec.onerror = (event) => {
      // Surface common cases so the UI can show a hint:
      //   'not-allowed'   → user denied mic permission
      //   'no-speech'     → silence timeout
      //   'audio-capture' → no mic hardware
      //   'network'       → STT backend unreachable
      setError(event.error || 'speech-error');
      setListening(false);
    };
    rec.onend = () => setListening(false);
    rec.onstart = () => setListening(true);

    recognitionRef.current = rec;
    return () => {
      try { rec.abort(); } catch { /* no-op */ }
      recognitionRef.current = null;
    };
    // Intentionally exclude `onResult` — handled via onResultRef above.
  }, [Ctor, lang, supported]);

  const start = useCallback(() => {
    if (!recognitionRef.current || listening) return;
    setError(null);
    try {
      recognitionRef.current.start();
      // Do NOT optimistically set listening=true here — onstart will do it.
      // If start() throws synchronously (e.g. mic permission previously
      // denied), the catch below keeps state consistent.
    } catch (e) {
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
