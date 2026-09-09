import React from 'react';
import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';

interface ChatDemoProps {
  /** Demo mode is on — the controls render at all. */
  isActive: boolean;
  /** A canned turn is queued to land. */
  isPlaying: boolean;
  /** Every canned turn has landed; offer a replay. */
  isComplete: boolean;
  onReplay: () => void;
}

/**
 * ChatDemo — status line and replay control for the canned conversation.
 *
 * Deliberately stateless. Playback (the cursor, the timers) lives in useChat,
 * because this component sits inside the panel and unmounts every time the
 * panel closes. When it owned the cursor, closing mid-demo and reopening
 * replayed the script from the top into a transcript that already held the
 * first half — every turn twice. See the demo section of useChat.
 */
const ChatDemo = ({ isActive, isPlaying, isComplete, onReplay }: ChatDemoProps) => {
  if (!isActive) return null;

  return (
    <div className="flex items-center gap-2 px-1">
      {isComplete && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={onReplay}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
          aria-label="Replay demo conversation"
        >
          <RotateCcw size={12} /> Replay
        </motion.button>
      )}
      {isPlaying && (
        <span className="text-[10px] text-slate-500 dark:text-slate-300 font-mono animate-pulse">
          Demo playing…
        </span>
      )}
    </div>
  );
};

export default ChatDemo;
