import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, X } from 'lucide-react';

/**
 * ChatLauncher — floating circular button with avatar, pulse animation,
 * and small "Chat with Hasnain" label.  Keyboard-focusable.
 *
 * Props:
 *   isOpen     – chat panel visibility state
 *   onToggle   – () => void
 *   unread     – number, unread badge count (0 = hidden)
 */
const AVATAR_SRC = '/me.jpg';

const ChatLauncher = ({ isOpen, onToggle, unread = 0 }) => (
  <motion.button
    onClick={onToggle}
    className="fixed bottom-6 right-6 z-50 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-full"
    whileHover={{ scale: 1.08 }}
    whileTap={{ scale: 0.92 }}
    aria-label={isOpen ? 'Close chat' : 'Open chat with Hasnain Raza'}
    aria-expanded={isOpen}
    aria-controls="chatbot-panel"
  >
    <div className={`relative p-3.5 rounded-full transition-all duration-500 backdrop-blur-md border-2 ${
      isOpen
        ? 'border-white/30 bg-red-500/80 shadow-[0_0_30px_rgba(239,68,68,0.6)] rotate-90'
        : 'border-neon-500/30 bg-primary/80 shadow-[0_0_30px_rgba(45,212,191,0.6)] hover:shadow-[0_0_50px_rgba(45,212,191,0.8)]'
    }`}>
      {/* Pulsing ring (only when closed) */}
      {!isOpen && (
        <div className="absolute inset-0 rounded-full border-2 border-primary/50 scale-110 animate-ping opacity-40 pointer-events-none" />
      )}

      <AnimatePresence mode="wait">
        {isOpen ? (
          <motion.div key="close" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }}>
            <X size={26} className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
          </motion.div>
        ) : (
          <motion.div key="open" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
            <Cpu size={26} className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unread badge */}
      {!isOpen && unread > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900 shadow-md">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </div>

    {/* Compact label visible on desktop when closed */}
    {!isOpen && (
      <motion.span
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        className="hidden md:flex items-center gap-2 absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-lg border border-slate-200 dark:border-white/10 pointer-events-none"
      >
        <Cpu size={14} className="text-primary shrink-0" />
        Chat
      </motion.span>
    )}
  </motion.button>
);

export default ChatLauncher;
