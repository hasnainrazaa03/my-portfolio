import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, User, Sparkles, Trash2, BarChart3, AlertTriangle, Play, Mic, MicOff } from 'lucide-react';
import { getChatResponse } from '../services/chatService.js';
import { analyticsService } from '../services/analyticsService';
import ChatLauncher from './ChatLauncher';
import ChatDemo from './ChatDemo';
import QnASearch from './QnASearch';
import { PERSONAL_INFO } from '../constants';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

// SECURITY/PERF: the admin AnalyticsViewer is only included in the bundle
// when explicitly enabled at build time. Production deploys ship without it.
const ADMIN_ENABLED = import.meta.env.VITE_ENABLE_ADMIN === 'true';
const AnalyticsViewer = ADMIN_ENABLED
  ? lazy(() => import('./AnalyticsViewer'))
  : null;

// TODO: Add /me.jpg to public/ — a square headshot of Hasnain for chat avatar & hero.
const AVATAR_SRC = '/me.jpg';

const renderMessageWithEmojis = (content) => {
  const lines = content.split('\n');
  
  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        if (!line.trim()) return null;
        
        const emojiRegex = /^\p{Extended_Pictographic}\s/u;
        const hasEmoji = emojiRegex.test(line);
        
        return (
          <div 
            key={idx}
            className={hasEmoji ? 'pl-1' : ''}
          >
            {line}
          </div>
        );
      })}
    </div>
  );
};

/** Small circular avatar — falls back to initials when image missing. */
const Avatar = ({ src, fallback, className = '' }) => {
  const [imgError, setImgError] = useState(false);
  if (imgError || !src) {
    return (
      <div className={`flex items-center justify-center font-bold text-xs select-none ${className}`}>
        {fallback}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt="Avatar"
      onError={() => setImgError(true)}
      className={`object-cover ${className}`}
    />
  );
};

const INITIAL_MESSAGE = { role: 'assistant', content: "Hey there! I'm Hasnain — feel free to ask about my 💻 projects, 🛠️ skills, 💼 experience, or 🎓 education. What would you like to know?" };
const CHIP_PREFIXES = ['🚀 ', '⚡ ', '💼 ', '📧 ', '📚 '];

// Allow-list of personas the UI can select. Must match the keys in
// PERSONA_OVERLAYS on the server (api/chat.js). The server re-validates.
const PERSONAS = [
  { key: 'default',   label: 'Default' },
  { key: 'recruiter', label: 'Recruiter' },
  { key: 'aerospace', label: 'Aerospace' },
  { key: 'startup',   label: 'Startup' },
];

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showAnalyticsVault, setShowAnalyticsVault] = useState(false);
  const [flaggedWarning, setFlaggedWarning] = useState(null);
  const [demoMode, setDemoMode] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [persona, setPersona] = useState('default');
  const messagesEndRef = useRef(null);
  const panelRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  const suggestions = [
    "🚀 Tell me about your projects",
    "⚡ What's your tech stack?",
    "💼 Experience at Deloitte?",
    "📧 How can I contact you?",
    "📚 Summarize your background"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, isTyping]);

  useEffect(() => {
    if (!isOpen) {
      setShowAnalyticsVault(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showAnalyticsVault) {
        const analyticsElement = document.querySelector('.analytics-vault');
        const chatbotElement = document.querySelector('.chatbot-container');
        
        if (analyticsElement && !analyticsElement.contains(e.target) && 
            chatbotElement && !chatbotElement.contains(e.target)) {
          setShowAnalyticsVault(false);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAnalyticsVault]);

  const extractTopics = () => {
    const userMessages = messages
      .filter(m => m.role === 'user')
      .map(m => m.content.toLowerCase());
    
    const topics = [];
    if (userMessages.some(m => m.includes('project') || m.includes('vimaan') || m.includes('tumor'))) {
      topics.push('💻 Projects');
    }
    if (userMessages.some(m => m.includes('skill') || m.includes('tech') || m.includes('language'))) {
      topics.push('⚡ Skills');
    }
    if (userMessages.some(m => m.includes('experience') || m.includes('work') || m.includes('deloitte'))) {
      topics.push('💼 Experience');
    }
    if (userMessages.some(m => m.includes('education') || m.includes('usc') || m.includes('university'))) {
      topics.push('🎓 Education');
    }
    return topics;
  };

  const getHistoryStats = () => {
    const userMessageCount = messages.filter(m => m.role === 'user').length;
    const topics = extractTopics();
    return {
      messageCount: messages.length,
      userQuestions: userMessageCount,
      topics: topics
    };
  };

  const processMessage = useCallback(async (text) => {
    if (!text.trim() || demoMode) return;

    const userMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Inline prepareHistoryForAPI so processMessage doesn't depend on a
    // non-memoised sibling that would invalidate this callback every render.
    const fullHistory = [...messages, userMessage];
    const maxHistoryLength = 10;
    const historyForApi = fullHistory.length <= maxHistoryLength
      ? fullHistory
      : [fullHistory[0], ...fullHistory.slice(-(maxHistoryLength - 1))];

    try {
      const responseResult = await getChatResponse(historyForApi, { persona });

      // Handle flagged input (prompt-injection / abuse detection)
      if (responseResult && typeof responseResult === 'object' && responseResult.__flagged) {
        setFlaggedWarning(responseResult.text);
        // Auto-dismiss after 6s
        setTimeout(() => setFlaggedWarning(null), 6000);
        // Remove the user message that was flagged
        setMessages(prev => prev.slice(0, -1));
        return;
      }

      const responseText = typeof responseResult === 'string' ? responseResult : responseResult?.text || 'Unable to generate response';
      setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
      
      analyticsService.logInteraction(text, responseText, {
        success: true,
        interactionType: 'user_query'
      });
    } catch {
      const errorResponse = "🤖 Connection interrupted. Please try again. 🔄";
      setMessages(prev => [...prev, { role: 'assistant', content: errorResponse }]);
      
      analyticsService.logInteraction(text, errorResponse, {
        success: false,
        interactionType: 'error'
      });
    } finally {
      setIsTyping(false);
    }
  }, [demoMode, messages, persona]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    processMessage(input);
  };

  // ── Voice input (speech-to-text) ───────────────────────────────────────
  // On result we submit immediately rather than just populating the input,
  // because users expect "push to talk → answer" UX. Errors are silently
  // swallowed (the hook flips `listening` back off) so the UI never sticks.
  const handleVoiceResult = useCallback((transcript) => {
    const text = transcript.trim();
    if (!text) return;
    setInput(text);
    processMessage(text);
  }, [processMessage]);
  const { supported: voiceSupported, listening: voiceListening, start: startVoice, stop: stopVoice } =
    useSpeechRecognition({ onResult: handleVoiceResult });
  const toggleVoice = () => (voiceListening ? stopVoice() : startVoice());

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

  const handleDemoMessage = useCallback((msg) => {
    setMessages(prev => [...prev, msg]);
    if (!isOpen) setUnreadCount(prev => prev + 1);
  }, [isOpen]);

  const handleDemoComplete = useCallback(() => {}, []);

  const handleDemoReset = useCallback(() => {
    setMessages([INITIAL_MESSAGE]);
  }, []);

  // ── QnA handlers ────────────────────────────────────────────────────────
  const handleUseLocalAnswer = useCallback((question, answer) => {
    setMessages(prev => [
      ...prev,
      { role: 'user', content: question },
      { role: 'assistant', content: answer }
    ]);
  }, []);

  const handleAskLive = useCallback((question) => {
    // SECURITY: do not pass a provider hint from the client — the server
    // picks the provider. (Previously this forced { provider: 'gemini' }.)
    processMessage(question);
  }, [processMessage]);

  // ── Focus trap + Escape-to-close + restore focus ──────────────────────
  useEffect(() => {
    if (!isOpen) return;
    previouslyFocusedRef.current = document.activeElement;
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = panel.querySelectorAll('button, input, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const trap = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setIsOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    panel.addEventListener('keydown', trap);
    first?.focus();
    return () => {
      panel.removeEventListener('keydown', trap);
      // Restore focus to the launcher (or whatever opened the panel).
      const target = previouslyFocusedRef.current;
      if (target && typeof target.focus === 'function') {
        target.focus();
      }
    };
  }, [isOpen]);

  // Reset unread when opened
  useEffect(() => {
    if (isOpen) setUnreadCount(0);
  }, [isOpen]);

  const stats = getHistoryStats();

  return (
    <>
      <ChatLauncher
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        unread={unreadCount}
      />



      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95, x: 20 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
            exit={{ opacity: 0, y: 20, scale: 0.95, x: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] h-[600px] max-h-[calc(100vh-120px)] rounded-2xl overflow-hidden shadow-2xl flex flex-col glass-panel border border-slate-200 dark:border-white/10 chatbot-container"
            id="chatbot-panel"
            ref={panelRef}
            role="dialog"
            aria-modal="false"
            aria-labelledby="chatbot-title"
            aria-label="Chat with Hasnain"
          >
            <div className="p-4 bg-slate-100/80 dark:bg-[#0F172A]/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-2 h-2 bg-green-500 rounded-full absolute bottom-0 right-0 z-10 ring-2 ring-slate-100 dark:ring-[#0F172A]" />
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center border border-primary/30">
                      <Avatar src={AVATAR_SRC} fallback="HR" className="w-full h-full rounded-full text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 id="chatbot-title" className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      Hasnain <Sparkles size={12} className="text-amber-400" />
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-primary/80 font-mono tracking-wider">ONLINE</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {/* Demo toggle */}
                  <button
                    onClick={handleDemoToggle}
                    className={`p-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                      demoMode
                        ? 'bg-primary/20 text-primary'
                        : 'hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-primary'
                    }`}
                    title={demoMode ? 'Exit demo' : 'Demo mode'}
                    aria-pressed={demoMode}
                  >
                    <Play size={14} />
                  </button>
                  {ADMIN_ENABLED && (
                    <motion.button 
                      whileHover={{ scale: 1.1 }}
                      onClick={() => setShowAnalyticsVault(!showAnalyticsVault)} 
                      className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-primary transition-colors"
                      title="View Analytics Vault"
                    >
                      <BarChart3 size={16} />
                    </motion.button>
                  )}
                  <button 
                    onClick={clearHistory} 
                    className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-red-500 transition-colors"
                    title="Clear conversation"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              {messages.length > 1 && (
                <div className="text-xs text-slate-600 dark:text-slate-400 font-mono space-y-0.5">
                  <div>💬 {stats.messageCount} messages</div>
                  <div>🧠 {stats.userQuestions} questions</div>
                  {stats.topics.length > 0 && (
                    <div>Topics: {stats.topics.join(' • ')}</div>
                  )}
                </div>
              )}

              {/* Persona selector — server validates value against an allow-list. */}
              <div className="mt-2 flex items-center gap-2 text-xs">
                <label htmlFor="chatbot-persona" className="text-slate-500 dark:text-slate-400">
                  Mode:
                </label>
                <select
                  id="chatbot-persona"
                  value={persona}
                  onChange={(e) => setPersona(e.target.value)}
                  disabled={isTyping || demoMode}
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded px-2 py-1 text-slate-800 dark:text-slate-200 focus:border-primary focus:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-50"
                  aria-label="Choose chat persona"
                >
                  {PERSONAS.map((p) => (
                    <option key={p.key} value={p.key}>{p.label}</option>
                  ))}
                </select>
                {persona !== 'default' && (
                  <span className="text-[10px] text-primary font-mono uppercase tracking-wider">
                    · {persona}
                  </span>
                )}
              </div>

              {/* Demo mode controls */}
              <ChatDemo
                isActive={demoMode}
                onMessage={handleDemoMessage}
                onComplete={handleDemoComplete}
                onReset={handleDemoReset}
              />
            </div>



            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-slate-50/50 dark:bg-[#030014]/60" aria-live="polite" aria-atomic="false">
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  {msg.role === 'user' ? (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-slate-200 dark:bg-white/10 border border-transparent">
                      <User size={14} className="text-slate-600 dark:text-white" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-primary/30 bg-primary/10">
                      <Avatar src={AVATAR_SRC} fallback="HR" className="w-full h-full rounded-full text-primary text-[10px]" />
                    </div>
                  )}



                  <div className={`p-3.5 rounded-2xl text-sm leading-relaxed max-w-[85%] shadow-sm animate-fade-slide ${
                    msg.role === 'user' 
                      ? 'bg-primary text-black font-medium rounded-tr-sm' 
                      : 'backdrop-blur-md bg-white/80 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 rounded-tl-sm shadow-[0_0_12px_rgba(45,212,191,0.04)]'
                  }`}>
                    {msg.role === 'assistant' 
                      ? <>{renderMessageWithEmojis(msg.content)}<span className="block text-[10px] opacity-50 mt-1.5 font-medium">— Hasnain</span></>
                      : msg.content
                    }
                  </div>
                </motion.div>
              ))}



              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/10 border border-primary/30 shrink-0">
                    <Avatar src={AVATAR_SRC} fallback="HR" className="w-full h-full rounded-full text-primary text-[10px]" />
                  </div>
                  
                  <div className="p-4 backdrop-blur-md bg-white/80 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/10 rounded-2xl rounded-tl-sm flex items-center gap-3 h-10">
                    <div className="flex gap-1.5 items-center">
                      <motion.div 
                        className="w-2 h-2 bg-primary rounded-full" 
                        animate={{ y: [0, -8, 0] }} 
                        transition={{ 
                          repeat: Infinity, 
                          duration: 0.8, 
                          delay: 0,
                          ease: "easeInOut"
                        }} 
                      />
                      <motion.div 
                        className="w-2 h-2 bg-primary rounded-full" 
                        animate={{ y: [0, -8, 0] }} 
                        transition={{ 
                          repeat: Infinity, 
                          duration: 0.8, 
                          delay: 0.1,
                          ease: "easeInOut"
                        }} 
                      />
                      <motion.div 
                        className="w-2 h-2 bg-primary rounded-full" 
                        animate={{ y: [0, -8, 0] }} 
                        transition={{ 
                          repeat: Infinity, 
                          duration: 0.8, 
                          delay: 0.2,
                          ease: "easeInOut"
                        }} 
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      Hasnain is typing...
                    </span>
                  </div>
                </motion.div>
              )}



              <div ref={messagesEndRef} />
            </div>



            {/* QnA Search panel */}
            {!demoMode && (
              <div className="px-4 pt-3 pb-1 bg-slate-50 dark:bg-[#0F172A] border-t border-slate-200 dark:border-white/10">
                <QnASearch
                  onUseAnswer={handleUseLocalAnswer}
                  onAskLive={handleAskLive}
                  disabled={isTyping || demoMode}
                />
              </div>
            )}

            <div className="px-4 pb-2 pt-2 bg-slate-50 dark:bg-[#0F172A]">
              <div className="flex gap-2 overflow-x-auto thin-scrollbar-x pb-2">
                {suggestions.map((chip, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      const text = CHIP_PREFIXES.find(prefix => chip.startsWith(prefix))
                        ? chip.slice(3)
                        : chip;
                      processMessage(text);
                    }}
                    disabled={isTyping}
                    className="whitespace-nowrap px-3 py-1.5 rounded-full bg-slate-200/50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-primary hover:text-black hover:border-primary dark:hover:border-primary transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {chip}
                  </motion.button>
                ))}
              </div>
            </div>



            <form onSubmit={handleFormSubmit} className="p-4 pt-2 bg-slate-50 dark:bg-[#0F172A]">
              {/* Flagged-input warning */}
              <AnimatePresence>
                {flaggedWarning && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-2 flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 px-3 py-2 text-xs text-red-700 dark:text-red-300"
                  >
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>{flaggedWarning}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about projects... 💭"
                  className={`w-full pl-4 py-3 rounded-xl bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-slate-900 dark:text-white placeholder-slate-400 transition-all text-sm shadow-inner ${voiceSupported ? 'pr-20' : 'pr-12'}`}
                  disabled={isTyping || demoMode}
                />
                {voiceSupported && (
                  <button
                    type="button"
                    onClick={toggleVoice}
                    disabled={isTyping || demoMode}
                    title={voiceListening ? 'Stop listening' : 'Speak your question (audio is sent to your browser\'s speech provider)'}
                    aria-label={voiceListening ? 'Stop voice input' : 'Start voice input'}
                    aria-pressed={voiceListening}
                    className={`absolute right-12 p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      voiceListening
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-white/20'
                    }`}
                  >
                    {voiceListening ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping || demoMode}
                  className="absolute right-2 p-2 bg-primary text-black rounded-lg hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-primary/20 dark:shadow-primary/30 dark:hover:shadow-[0_0_16px_rgba(45,212,191,0.5)]"
                >
                  {isTyping ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>


      {ADMIN_ENABLED && AnalyticsViewer && (
        <Suspense fallback={null}>
          <AnalyticsViewer 
            isOpen={showAnalyticsVault}
            onClose={() => setShowAnalyticsVault(false)}
            className="analytics-vault"
          />
        </Suspense>
      )}
    </>
  );
};

export default Chatbot;
