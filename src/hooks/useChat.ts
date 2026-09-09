import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { getChatResponse } from '../services/chatService';
import { analyticsService } from '../services/analyticsService';
import { INITIAL_MESSAGE } from '../components/chat/chatConstants';
import type { ChatMessage, SourceLink } from '../components/chat/types';

/** Message identity. crypto.randomUUID is universal in the browsers this site supports. */
const newId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `m-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * useChat — owns the chat conversation state and message lifecycle, extracted
 * from the Chatbot monolith (Phase 3 / T3.1). Behavior is preserved verbatim.
 *
 * @param opts panel open state (drives unread reset + the unread increment for
 *   demo messages received while closed)
 */
export function useChat({ isOpen }: { isOpen: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  /**
   * True from send until the reply is FINAL. Distinct from `isTyping`, which
   * is only the indicator and rightly goes quiet once words start arriving.
   * Everything that can mutate the transcript — the composer, the chips, the
   * local Q&A, "clear" — locks on this, not on the indicator. Unlocking on the
   * first delta let a second send land while the first reply was still
   * streaming into the transcript.
   */
  const [isBusy, setIsBusy] = useState(false);
  const [flaggedWarning, setFlaggedWarning] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [persona, setPersona] = useState('default');

  const extractTopics = () => {
    const userMessages = messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content.toLowerCase());

    const topics = [];
    if (userMessages.some((m) => m.includes('project') || m.includes('vimaan') || m.includes('tumor'))) {
      topics.push('💻 Projects');
    }
    if (userMessages.some((m) => m.includes('skill') || m.includes('tech') || m.includes('language'))) {
      topics.push('⚡ Skills');
    }
    if (userMessages.some((m) => m.includes('experience') || m.includes('work') || m.includes('deloitte'))) {
      topics.push('💼 Experience');
    }
    if (userMessages.some((m) => m.includes('education') || m.includes('usc') || m.includes('university'))) {
      topics.push('🎓 Education');
    }
    return topics;
  };

  const getHistoryStats = () => {
    const userMessageCount = messages.filter((m) => m.role === 'user').length;
    return {
      messageCount: messages.length,
      userQuestions: userMessageCount,
      topics: extractTopics(),
    };
  };

  const processMessage = useCallback(async (text: string) => {
    if (!text.trim() || demoMode || isBusy) return;

    const userMessage: ChatMessage = { id: newId(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setIsBusy(true);

    // Inline prepareHistoryForAPI so processMessage doesn't depend on a
    // non-memoised sibling that would invalidate this callback every render.
    const fullHistory = [...messages, userMessage];
    const maxHistoryLength = 10;
    const historyForApi = fullHistory.length <= maxHistoryLength
      ? fullHistory
      : [fullHistory[0], ...fullHistory.slice(-(maxHistoryLength - 1))];

    // The streaming bubble is created on the FIRST delta, never up front — a
    // flagged message and a failed request both need the user's turn handled
    // first, and an empty assistant bubble before we know which would flicker.
    // It is addressed by this id from then on; see ChatMessage.id.
    const replyId = newId();
    let sources: SourceLink[] | undefined;

    /** Replace the streamed bubble; if it is gone (transcript cleared), the reply is moot. */
    const finalise = (content: string, extra: Partial<ChatMessage> = {}) =>
      setMessages((prev) =>
        prev.some((m) => m.id === replyId)
          ? prev.map((m) => (m.id === replyId ? { ...m, content, ...extra } : m))
          : prev.some((m) => m.id === userMessage.id)
            ? [...prev, { id: replyId, role: 'assistant', content, ...extra }]
            : prev,
      );

    try {
      const responseResult = await getChatResponse(historyForApi, {
        persona,
        // The server writes the analytics row now; it needs this only to group
        // a visitor's turns together.
        sessionId: analyticsService.sessionId,
        // Arrives with the final reply, so it is attached when the message is
        // finalised below rather than mid-stream.
        onSources: (s) => {
          sources = s;
        },
        onDelta: (piece) => {
          // Pure updater: whether the bubble exists is read from `prev`, so a
          // StrictMode double-invoke cannot glue a delta onto the wrong turn.
          setMessages((prev) =>
            prev.some((m) => m.id === replyId)
              ? prev.map((m) => (m.id === replyId ? { ...m, content: m.content + piece } : m))
              : [...prev, { id: replyId, role: 'assistant', content: piece }],
          );
          // Typing indicator is redundant once words are appearing. The busy
          // lock stays until the reply is final.
          setIsTyping(false);
        },
      });

      // Handle flagged input (prompt-injection / abuse detection)
      if (responseResult && typeof responseResult === 'object' && responseResult.__flagged) {
        setFlaggedWarning(responseResult.text);
        // Auto-dismiss after 6s
        setTimeout(() => setFlaggedWarning(null), 6000);
        // Remove the flagged turn by identity, not by position.
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id && m.id !== replyId));
        return;
      }

      const responseText = typeof responseResult === 'string'
        ? responseResult
        : responseResult?.text || 'Unable to generate response';

      // The canonical reply differs from the streamed text only by the
      // "[Ask about: …]" affordance the server withholds during streaming, so
      // this reads as the chips arriving, not as a rewrite.
      finalise(responseText, { sources });

      analyticsService.logInteraction(text, responseText, {
        success: true,
        interactionType: 'user_query',
      });
    } catch {
      const errorResponse = '🤖 Connection interrupted. Please try again. 🔄';
      // Replace a half-streamed bubble rather than appending below it — two
      // assistant messages, one of them a truncated fragment, reads as a bug.
      finalise(errorResponse);

      analyticsService.logInteraction(text, errorResponse, {
        success: false,
        interactionType: 'error',
      });
    } finally {
      setIsTyping(false);
      setIsBusy(false);
    }
  }, [demoMode, isBusy, messages, persona]);

  const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    processMessage(input);
  };

  const clearHistory = () => {
    // Refused mid-stream rather than racing the reply that is still landing.
    if (isBusy) return;
    setMessages([INITIAL_MESSAGE]);
    setFlaggedWarning(null);
  };

  // ── Demo mode handlers ──────────────────────────────────────────────────
  const handleDemoToggle = () => {
    const next = !demoMode;
    setDemoMode(next);
    if (next) {
      setMessages([INITIAL_MESSAGE]);
      setFlaggedWarning(null);
    }
  };

  const handleDemoMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
    if (!isOpen) setUnreadCount((prev) => prev + 1);
  }, [isOpen]);

  const handleDemoComplete = useCallback(() => {}, []);

  const handleDemoReset = useCallback(() => {
    setMessages([INITIAL_MESSAGE]);
  }, []);

  // ── QnA handlers ────────────────────────────────────────────────────────
  const handleUseLocalAnswer = useCallback((question: string, answer: string) => {
    if (isBusy) return;
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: question },
      { role: 'assistant', content: answer },
    ]);
  }, [isBusy]);

  const handleAskLive = useCallback((question: string) => {
    // SECURITY: do not pass a provider hint from the client — the server
    // picks the provider. (Previously this forced { provider: 'gemini' }.)
    processMessage(question);
  }, [processMessage]);

  // Reset unread when opened.
  useEffect(() => {
    if (isOpen) setUnreadCount(0);
  }, [isOpen]);

  return {
    messages,
    input,
    setInput,
    isTyping,
    isBusy,
    flaggedWarning,
    demoMode,
    unreadCount,
    persona,
    setPersona,
    processMessage,
    handleFormSubmit,
    clearHistory,
    handleDemoToggle,
    handleDemoMessage,
    handleDemoComplete,
    handleDemoReset,
    handleUseLocalAnswer,
    handleAskLive,
    stats: getHistoryStats(),
  };
}

export default useChat;
