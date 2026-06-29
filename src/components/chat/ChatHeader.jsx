import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Trash2, BarChart3, Play, Volume2, VolumeX } from 'lucide-react';
import Avatar from './Avatar';
import ChatDemo from '../ChatDemo';
import { AVATAR_SRC, PERSONAS } from './chatConstants';

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
  stats,
  messagesLength,
  persona,
  onPersonaChange,
  isTyping,
  onDemoMessage,
  onDemoComplete,
  onDemoReset,
}) => (
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
          onClick={onDemoToggle}
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
          className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-red-500 transition-colors"
          title="Clear conversation"
        >
          <Trash2 size={16} />
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
      onMessage={onDemoMessage}
      onComplete={onDemoComplete}
      onReset={onDemoReset}
    />
  </div>
);

export default ChatHeader;
