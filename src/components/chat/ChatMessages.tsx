import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import Avatar from './Avatar';
import { AVATAR_SRC } from './chatConstants';
import type { ChatMessage } from './types';

const renderMessageWithEmojis = (content: string) => {
  const lines = content.split('\n');

  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        if (!line.trim()) return null;

        const emojiRegex = /^\p{Extended_Pictographic}\s/u;
        const hasEmoji = emojiRegex.test(line);

        return (
          <div key={idx} className={hasEmoji ? 'pl-1' : ''}>
            {line}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Scrollable transcript: the message bubbles + the "typing" indicator.
 * Auto-scrolls to the latest message whenever messages/typing change.
 */
interface ChatMessagesProps {
  messages: ChatMessage[];
  isTyping: boolean;
}

const ChatMessages = ({ messages, isTyping }: ChatMessagesProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div
      className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-slate-50/50 dark:bg-[#030014]/60"
      aria-live="polite"
      aria-atomic="false"
    >
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
              {[0, 0.1, 0.2].map((delay) => (
                <motion.div
                  key={delay}
                  className="w-2 h-2 bg-primary rounded-full"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8, delay, ease: 'easeInOut' }}
                />
              ))}
            </div>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Hasnain is typing...
            </span>
          </div>
        </motion.div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessages;
