import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatLauncher from './ChatLauncher';
import QnASearch from './QnASearch';
import ChatHeader from './chat/ChatHeader';
import ChatMessages from './chat/ChatMessages';
import ChatInput from './chat/ChatInput';
import { useChat } from '../hooks/useChat';
import { useChatVoice } from '../hooks/useChatVoice';
import { useFocusTrap } from '../hooks/useFocusTrap';

// SECURITY/PERF: the admin AnalyticsViewer is only included in the bundle
// when explicitly enabled at build time. Production deploys ship without it.
const ADMIN_ENABLED = import.meta.env.VITE_ENABLE_ADMIN === 'true';
const AnalyticsViewer = ADMIN_ENABLED
  ? lazy(() => import('./AnalyticsViewer'))
  : null;

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAnalyticsVault, setShowAnalyticsVault] = useState(false);
  const panelRef = useRef(null);

  const chat = useChat({ isOpen });
  const voice = useChatVoice({
    messages: chat.messages,
    isOpen,
    processMessage: chat.processMessage,
    setInput: chat.setInput,
  });

  // Tab-cycle focus trap + Escape-to-close + focus restoration.
  useFocusTrap(panelRef, { active: isOpen, onEscape: () => setIsOpen(false) });

  // Close the analytics vault whenever the panel closes.
  useEffect(() => {
    if (!isOpen) setShowAnalyticsVault(false);
  }, [isOpen]);

  // Dismiss the analytics vault on an outside click.
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

  return (
    <>
      <ChatLauncher
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        unread={chat.unreadCount}
      />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95, x: 20 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
            exit={{ opacity: 0, y: 20, scale: 0.95, x: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] h-[600px] max-h-[calc(100vh-120px)] rounded-2xl overflow-hidden shadow-2xl flex flex-col glass-panel border border-slate-200 dark:border-white/10 chatbot-container"
            id="chatbot-panel"
            ref={panelRef}
            role="dialog"
            aria-modal="false"
            aria-labelledby="chatbot-title"
            aria-label="Chat with Hasnain"
          >
            <ChatHeader
              demoMode={chat.demoMode}
              onDemoToggle={chat.handleDemoToggle}
              ttsSupported={voice.ttsSupported}
              ttsEnabled={voice.ttsEnabled}
              ttsSpeaking={voice.ttsSpeaking}
              onToggleTts={voice.toggleTts}
              adminEnabled={ADMIN_ENABLED}
              onToggleAnalytics={() => setShowAnalyticsVault((v) => !v)}
              onClearHistory={chat.clearHistory}
              stats={chat.stats}
              messagesLength={chat.messages.length}
              persona={chat.persona}
              onPersonaChange={chat.setPersona}
              isTyping={chat.isTyping}
              onDemoMessage={chat.handleDemoMessage}
              onDemoComplete={chat.handleDemoComplete}
              onDemoReset={chat.handleDemoReset}
            />

            <ChatMessages messages={chat.messages} isTyping={chat.isTyping} />

            {/* QnA Search panel */}
            {!chat.demoMode && (
              <div className="px-4 pt-3 pb-1 bg-slate-50 dark:bg-[#0F172A] border-t border-slate-200 dark:border-white/10">
                <QnASearch
                  onUseAnswer={chat.handleUseLocalAnswer}
                  onAskLive={chat.handleAskLive}
                  disabled={chat.isTyping || chat.demoMode}
                />
              </div>
            )}

            <ChatInput
              input={chat.input}
              onInputChange={chat.setInput}
              onSubmit={chat.handleFormSubmit}
              isTyping={chat.isTyping}
              demoMode={chat.demoMode}
              flaggedWarning={chat.flaggedWarning}
              voiceSupported={voice.voiceSupported}
              voiceListening={voice.voiceListening}
              voiceErrorMessage={voice.voiceErrorMessage}
              onToggleVoice={voice.toggleVoice}
              onSendText={chat.processMessage}
            />
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
