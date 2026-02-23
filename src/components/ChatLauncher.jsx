import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, X } from 'lucide-react';

/**
 * ChatLauncher — icon-only floating circular button with pulse ring,
 * unread badge, and accessible tooltip.  Keyboard-focusable.
 *
 * Props:
 *   isOpen     – chat panel visibility state
 *   onToggle   – () => void
 *   unread     – number, unread badge count (0 = hidden)
 */
const ChatLauncher = ({ isOpen, onToggle, unread = 0 }) => (
  <motion.button
    type="button"
    onClick={onToggle}
    className="fixed bottom-6 right-6 z-50 group flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
    whileHover={{ scale: 1.08 }}
    whileTap={{ scale: 0.92 }}
    aria-label={isOpen ? 'Close chat' : 'Open chat with Hasnain Raza'}
    aria-expanded={isOpen}
    aria-controls="chatbot-panel"
    title={isOpen ? 'Close chat' : 'Chat with Hasnain Raza'}
  >
    <div className={`relative flex items-center justify-center w-full h-full rounded-full transition-all duration-500 backdrop-blur-md border-2 ${
      isOpen
        ? 'border-white/30 bg-red-500/80 shadow-[0_0_30px_rgba(239,68,68,0.6)] rotate-90'
        : 'border-neon-500/30 bg-primary/80 shadow-[0_0_30px_rgba(45,212,191,0.6)] group-hover:shadow-[0_0_50px_rgba(45,212,191,0.8)]'
    }`}>
      {/* Pulsing ring (only when closed) */}
      {!isOpen && (
        <span className="absolute inset-0 rounded-full ring-2 ring-neon-500/20 animate-pulse-slow pointer-events-none" aria-hidden="true" />
      )}

      <AnimatePresence mode="wait">
        {isOpen ? (
          <motion.div key="close" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }}>
            <X className="w-7 h-7 md:w-8 md:h-8 text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
          </motion.div>
        ) : (
          <motion.div key="open" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
            <Cpu className="w-7 h-7 md:w-8 md:h-8 text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" aria-hidden="true" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unread badge */}
      {!isOpen && unread > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900 shadow-md" aria-hidden="true">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </div>
  </motion.button>
);

export default ChatLauncher;