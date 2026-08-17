import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { getChatResponse } from '../services/chatService';
import { analyticsService } from '../services/analyticsService';
import { INITIAL_MESSAGE } from '../components/chat/chatConstants';
import type { ChatMessage } from '../components/chat/types';

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
    if (!text.trim() || demoMode) return;

    const userMessage: ChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Inline prepareHistoryForAPI so processMessage doesn't depend on a
    // non-memoised sibling that would invalidate this callback every render.
    const fullHistory = [...messages, userMessage];
    const maxHistoryLength = 10;
    const historyForApi = fullHistory.length <= maxHistoryLength
      ? fullHistory
      : [fullHistory[0], ...fullHistory.slice(-(maxHistoryLength - 1))];

    // The streaming placeholder is only appended on the FIRST delta, never up
    // front. A flagged message and a failed request both remove the user's
    // turn or replace it, and an empty assistant bubble appearing before we
    // know which of those happened would flicker on screen.
    let streaming = false;

    try {
      const responseResult = await getChatResponse(historyForApi, {
        persona,
        onDelta: (piece) => {
          setMessages((prev) => {
            if (!streaming) {
              streaming = true;
              return [...prev, { role: 'assistant', content: piece }];
            }
            const last = prev[prev.length - 1];
            return [...prev.slice(0, -1), { ...last, content: last.content + piece }];
          });
          // Typing indicator is redundant once words are appearing.
          setIsTyping(false);
        },
      });

      // Handle flagged input (prompt-injection / abuse detection)
      if (responseResult && typeof responseResult === 'object' && responseResult.__flagged) {
        setFlaggedWarning(responseResult.text);
        // Auto-dismiss after 6s
        setTimeout(() => setFlaggedWarning(null), 6000);
        // Remove the user message that was flagged
        setMessages((prev) => prev.slice(0, -1));
        return;
      }

      const responseText = typeof responseResult === 'string'
        ? responseResult
        : responseResult?.text || 'Unable to generate response';

      setMessages((prev) =>
        // Replace the streamed placeholder with the canonical reply. It differs
        // only by the "[Ask about: …]" affordance the server withholds during
        // streaming, so this reads as the chips arriving, not as a rewrite.
        streaming
          ? [...prev.slice(0, -1), { role: 'assistant', content: responseText }]
          : [...prev, { role: 'assistant', content: responseText }],
      );

      analyticsService.logInteraction(text, responseText, {
        success: true,
        interactionType: 'user_query',
      });
    } catch {
      const errorResponse = '🤖 Connection interrupted. Please try again. 🔄';
      // Replace a half-streamed bubble rather than appending below it — two
      // assistant messages, one of them a truncated fragment, reads as a bug.
      setMessages((prev) =>
        streaming
          ? [...prev.slice(0, -1), { role: 'assistant', content: errorResponse }]
          : [...prev, { role: 'assistant', content: errorResponse }],
      );

      analyticsService.logInteraction(text, errorResponse, {
        success: false,
        interactionType: 'error',
      });
    } finally {
      setIsTyping(false);
    }
  }, [demoMode, messages, persona]);

  const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    processMessage(input);
  };

  const clearHistory = () => {
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
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: question },
      { role: 'assistant', content: answer },
    ]);
  }, []);

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
