import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, AlertTriangle, Mic, MicOff } from 'lucide-react';
import { SUGGESTIONS, CHIP_PREFIXES } from './chatConstants';

/**
 * ChatInput — quick-suggestion chips + the message form (flagged-input and
 * voice-error banners, text field, voice button, send button).
 */
const ChatInput = ({
  input,
  onInputChange,
  onSubmit,
  isTyping,
  demoMode,
  flaggedWarning,
  voiceSupported,
  voiceListening,
  voiceErrorMessage,
  onToggleVoice,
  onSendText,
}) => (
  <>
    <div className="px-4 pb-2 pt-2 bg-slate-50 dark:bg-[#0F172A]">
      <div className="flex gap-2 overflow-x-auto thin-scrollbar-x pb-2">
        {SUGGESTIONS.map((chip, idx) => (
          <motion.button
            key={idx}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              const text = CHIP_PREFIXES.find((prefix) => chip.startsWith(prefix))
                ? chip.slice(3)
                : chip;
              onSendText(text);
            }}
            disabled={isTyping}
            className="whitespace-nowrap px-3 py-1.5 rounded-full bg-slate-200/50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-primary hover:text-black hover:border-primary dark:hover:border-primary transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {chip}
          </motion.button>
        ))}
      </div>
    </div>

    <form onSubmit={onSubmit} className="p-4 pt-2 bg-slate-50 dark:bg-[#0F172A]">
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

      {/* Voice-input error */}
      <AnimatePresence>
        {voiceErrorMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2 flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-300"
            role="status"
          >
            <MicOff size={14} className="shrink-0 mt-0.5" />
            <span>{voiceErrorMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Ask about projects... 💭"
          className={`w-full pl-4 py-3 rounded-xl bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-slate-900 dark:text-white placeholder-slate-400 transition-all text-sm shadow-inner ${voiceSupported ? 'pr-20' : 'pr-12'}`}
          disabled={isTyping || demoMode}
        />
        {voiceSupported && (
          <button
            type="button"
            onClick={onToggleVoice}
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
  </>
);

export default ChatInput;
