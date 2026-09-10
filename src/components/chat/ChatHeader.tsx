import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Trash2, BarChart3, Play, Volume2, VolumeX, X } from 'lucide-react';
import Avatar from './Avatar';
import ChatDemo from '../ChatDemo';
import { AVATAR_SRC, PERSONAS } from './chatConstants';
import type { ChatStats } from './types';

interface ChatHeaderProps {
  demoMode: boolean;
  onDemoToggle: () => void;
  ttsSupported: boolean;
  ttsEnabled: boolean;
  ttsSpeaking: boolean;
  onToggleTts: () => void;
  adminEnabled: boolean;
  onToggleAnalytics: () => void;
  onClearHistory: () => void;
  /** Close the panel from INSIDE it. The launcher sits outside the focus trap,
   *  so without this a keyboard or screen-reader user's only exit is Escape. */
  onClose: () => void;
  /** A reply is still landing; anything that mutates the transcript is locked. */
  isBusy: boolean;
  stats: ChatStats;
  messagesLength: number;
  persona: string;
  onPersonaChange: (persona: string) => void;
  isTyping: boolean;
  /** Demo playback state — owned by useChat, so it survives the panel closing. */
  demoPlaying: boolean;
  demoComplete: boolean;
  onDemoReplay: () => void;
}

/**
 * ChatHeader — title bar: avatar/status, demo + TTS + admin + clear controls,
 * conversation stats, persona selector, and the demo-mode controls.
 */
const ChatHeader = ({
  demoMode,
  onDemoToggle,
  ttsSupported,
  ttsEnabled,
  ttsSpeaking,
  onToggleTts,
  adminEnabled,
  onToggleAnalytics,
  onClearHistory,
  onClose,
  isBusy,
  stats,
  messagesLength,
  persona,
  onPersonaChange,
  isTyping,
  demoPlaying,
  demoComplete,
  onDemoReplay,
}: ChatHeaderProps) => (
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
        {/* Disabled while a reply lands: entering or leaving demo mode replaces
            the transcript, which is the same class of change as "clear". */}
        <button
          onClick={onDemoToggle}
          disabled={isBusy}
          className={`p-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed ${
            demoMode
              ? 'bg-primary/20 text-primary'
              : 'hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-primary'
          }`}
          title={isBusy ? 'Wait for the reply to finish' : demoMode ? 'Exit demo' : 'Demo mode'}
          aria-pressed={demoMode}
          aria-label={demoMode ? 'Exit demo mode' : 'Play demo conversation'}
        >
          <Play size={14} />
        </button>
        {ttsSupported && (
          <button
            onClick={onToggleTts}
            className={`p-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
              ttsEnabled
                ? 'bg-primary/20 text-primary'
                : 'hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-primary'
            }`}
            title={ttsEnabled ? (ttsSpeaking ? 'Speaking… click to mute' : 'Voice replies on') : 'Voice replies off'}
            aria-pressed={ttsEnabled}
            aria-label="Toggle voice replies"
          >
            {ttsEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
        )}
        {adminEnabled && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            onClick={onToggleAnalytics}
            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-primary transition-colors"
            title="View Analytics Vault"
          >
            <BarChart3 size={16} />
          </motion.button>
        )}
        <button
          onClick={onClearHistory}
          disabled={isBusy}
          className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-slate-400"
          title={isBusy ? 'Wait for the reply to finish' : 'Clear conversation'}
          aria-label="Clear conversation"
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title="Close chat"
          aria-label="Close chat"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>

    {messagesLength > 1 && (
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
        onChange={(e) => onPersonaChange(e.target.value)}
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
      isPlaying={demoPlaying}
      isComplete={demoComplete}
      onReplay={onDemoReplay}
    />
  </div>
);

export default ChatHeader;
