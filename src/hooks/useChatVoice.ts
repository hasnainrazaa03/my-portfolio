import { useCallback, useEffect, useRef, useState } from 'react';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useSpeechSynthesis } from './useSpeechSynthesis';
import type { ChatMessage } from '../components/chat/types';

interface UseChatVoiceOptions {
  messages: ChatMessage[];
  /** A reply is still streaming in; do not read a fragment aloud. */
  isBusy?: boolean;
  isOpen: boolean;
  processMessage: (text: string) => void;
  setInput: (value: string) => void;
}

/**
 * useChatVoice — speech-to-text input + opt-in text-to-speech replies for the
 * chatbot, extracted from the monolith (Phase 3 / T3.1). Behavior preserved.
 */
export function useChatVoice({ messages, isBusy = false, isOpen, processMessage, setInput }: UseChatVoiceOptions) {
  // ── Voice input (speech-to-text) ───────────────────────────────────────
  // On result we submit immediately rather than just populating the input,
  // because users expect "push to talk → answer" UX. Errors are silently
  // swallowed (the hook flips `listening` back off) so the UI never sticks.
  const handleVoiceResult = useCallback((transcript: string) => {
    const text = transcript.trim();
    if (!text) return;
    setInput(text);
    processMessage(text);
  }, [processMessage, setInput]);

  const { supported: voiceSupported, listening: voiceListening, error: voiceError, start: startVoice, stop: stopVoice } =
    useSpeechRecognition({ onResult: handleVoiceResult });
  const toggleVoice = () => (voiceListening ? stopVoice() : startVoice());

  // ── Voice output (text-to-speech) ──────────────────────────────────────
  // `ttsEnabled` is opt-in (default off) so the chat is silent unless the
  // user explicitly turns it on via the speaker toggle in the header.
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const { supported: ttsSupported, speaking: ttsSpeaking, speak: ttsSpeak, cancel: ttsCancel } =
    useSpeechSynthesis();

  // Speak each new *assistant* reply when TTS is enabled — once it is FINAL.
  // Keyed on message identity, not array index: with streaming, the reply's
  // index is fixed on the first delta while its content keeps changing, so an
  // index key spoke the first word or two and then went silent. Skip the
  // greeting (length === 1) so toggling on doesn't suddenly read it aloud.
  const lastSpokenRef = useRef<string | null>(null);
  useEffect(() => {
    if (!ttsEnabled || !ttsSupported || isBusy) return;
    if (messages.length <= 1) return;
    const last = messages[messages.length - 1];
    if (last?.role !== 'assistant' || typeof last.content !== 'string') return;
    // Static messages (demo, local answers) have no id; fall back to content.
    const key = last.id ?? `${messages.length}:${last.content}`;
    if (key === lastSpokenRef.current) return;
    lastSpokenRef.current = key;
    ttsSpeak(last.content);
  }, [messages, isBusy, ttsEnabled, ttsSupported, ttsSpeak]);

  const toggleTts = () => {
    setTtsEnabled((prev) => {
      const next = !prev;
      if (!next) ttsCancel();
      return next;
    });
  };

  // Stop any in-flight speech when the panel is closed.
  useEffect(() => {
    if (!isOpen) ttsCancel();
  }, [isOpen, ttsCancel]);

  // Translate raw SpeechRecognition error codes into user-friendly hints.
  const voiceErrorMessage = (() => {
    if (!voiceError) return null;
    switch (voiceError) {
      case 'not-allowed':
      case 'service-not-allowed':
        return 'Microphone blocked. Allow mic access in your browser\'s site settings and reload.';
      case 'no-speech':
        return 'No speech detected. Try again and speak after the mic turns red.';
      case 'audio-capture':
        return 'No microphone found on this device.';
      case 'network':
        return 'Speech service unreachable. Check your connection.';
      default:
        return `Voice input error (${voiceError}). Try again or type instead.`;
    }
  })();

  return {
    voiceSupported,
    voiceListening,
    voiceErrorMessage,
    toggleVoice,
    ttsSupported,
    ttsEnabled,
    ttsSpeaking,
    toggleTts,
  };
}

export default useChatVoice;
