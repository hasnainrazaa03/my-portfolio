import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw } from 'lucide-react';
import demoMessagesJson from '../data/chatDemo.json';
import type { ChatMessage } from './chat/types';

const demoMessages = demoMessagesJson as ChatMessage[];

interface ChatDemoProps {
  isActive: boolean;
  onMessage?: (msg: ChatMessage) => void;
  onComplete?: () => void;
  onReset?: () => void;
}

/**
 * ChatDemo — plays a canned conversation with typing animation.
 */
const ChatDemo = ({ isActive, onMessage, onComplete, onReset }: ChatDemoProps) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const play = useCallback(() => {
    if (!isActive) return;
    setIsPlaying(true);
    setCurrentIdx(0);
  }, [isActive]);

  // Auto-start on first activation
  useEffect(() => {
    if (isActive && !isPlaying && currentIdx === 0) {
      play();
    }
  }, [isActive, isPlaying, currentIdx, play]);

  // Feed messages one-by-one with delays
  useEffect(() => {
    if (!isPlaying || !isActive) return;

    if (currentIdx >= demoMessages.length) {
      setIsPlaying(false);
      onComplete?.();
      return;
    }

    const msg = demoMessages[currentIdx];
    // Simulate typing delay — longer for assistant messages
    const delay = msg.role === 'assistant' ? 1200 : 600;

    timerRef.current = setTimeout(() => {
      onMessage?.(msg);
      setCurrentIdx(prev => prev + 1);
    }, delay);

    return () => clearTimeout(timerRef.current ?? undefined);
  }, [isPlaying, isActive, currentIdx, onMessage, onComplete]);

  // Cleanup on unmount
  useEffect(() => () => clearTimeout(timerRef.current ?? undefined), []);

  if (!isActive) return null;

  return (
    <div className="flex items-center gap-2 px-1">
      {!isPlaying && currentIdx >= demoMessages.length && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => {
            onReset?.();
            setCurrentIdx(0);
            setIsPlaying(true);
          }}
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
