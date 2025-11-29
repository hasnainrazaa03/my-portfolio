import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, User, Bot, Sparkles, Cpu, Trash2, BarChart3 } from 'lucide-react';
import { getChatResponse } from '../services/chatService.js';
import { analyticsService } from '../services/analyticsService';
import AnalyticsViewer from './AnalyticsViewer';


/**
 * Parse and render emoji-enhanced messages
 * Handles emoji line breaks and formatting
 */
const renderMessageWithEmojis = (content) => {
  // Split by emoji lines for better visual hierarchy
  const lines = content.split('\n');
  
  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        if (!line.trim()) return null;
        
        // Check if line starts with emoji
        const emojiRegex = /^([🤖💼💻🛠️🎓📧🚀💡🎯🏢📚🐙⚡🎨🧠🛸⚙️🌬️🐍🎨✨⚛️🍳🏋️✈️📊🔧🎬🎭🎪🎨🖼️🎯])\s/;
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


const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "🤖 Hello! I am Jarvis, Hasnain's AI assistant. Ask me about his 💻 projects, 🛠️ skills, 💼 experience, or 🎓 education. How may I assist?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showAnalyticsVault, setShowAnalyticsVault] = useState(false);
  const messagesEndRef = useRef(null);


  // Quick Chip Suggestions with emojis
  const suggestions = [
    "🚀 Tell me about his projects",
    "⚡ What is your tech stack?",
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


  const getConversationContext = () => {
    if (messages.length <= 1) return "";
    const recentMessages = messages.slice(-5);
    const userMessages = recentMessages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join("; ");
    return userMessages ? `User's recent questions: ${userMessages}` : "";
  };


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


  const prepareHistoryForAPI = (newUserMessage) => {
    const fullHistory = [...messages, newUserMessage];
    const maxHistoryLength = 10;
    let historyToSend;
    
    if (fullHistory.length <= maxHistoryLength) {
      historyToSend = fullHistory;
    } else {
      historyToSend = [
        fullHistory[0],
        ...fullHistory.slice(-(maxHistoryLength - 1))
      ];
    }
    return historyToSend;
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


  /**
   * Process message with analytics logging
   * 📊 NEW: Logs every interaction to analyticsService
   */
  const processMessage = async (text) => {
    if (!text.trim()) return;

    const userMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    const historyForApi = prepareHistoryForAPI(userMessage);

    try {
      const responseText = await getChatResponse(historyForApi);
      setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
      
      // 📊 LOG TO ANALYTICS - New feature!
      analyticsService.logInteraction(text, responseText, {
        success: true,
        interactionType: 'user_query'
      });
    } catch (error) {
      const errorResponse = "🤖 Connection interrupted. Please try again. 🔄";
      setMessages(prev => [...prev, { role: 'assistant', content: errorResponse }]);
      
      // 📊 LOG FAILED INTERACTION
      analyticsService.logInteraction(text, errorResponse, {
        success: false,
        interactionType: 'error'
      });
    } finally {
      setIsTyping(false);
    }
  };


  const handleFormSubmit = (e) => {
    e.preventDefault();
    processMessage(input);
  };


  const clearHistory = () => {
    setMessages([
      { role: 'assistant', content: "🤖 Hello! I am Jarvis, Hasnain's AI assistant. Ask me about his 💻 projects, 🛠️ skills, 💼 experience, or 🎓 education. How may I assist?" }
    ]);
  };


  const stats = getHistoryStats();


  return (
    <>
      {/* Toggle Button - Sci-Fi AI Core Style */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 group"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label="Toggle Jarvis"
      >
        <div className={`relative p-4 rounded-full transition-all duration-500 ${
          isOpen 
            ? 'bg-red-500/80 shadow-[0_0_30px_rgba(239,68,68,0.6)] rotate-90' 
            : 'bg-primary/80 shadow-[0_0_30px_rgba(45,212,191,0.6)] hover:shadow-[0_0_50px_rgba(45,212,191,0.8)]'
        } backdrop-blur-md border-2 border-white/30`}>
          
          {!isOpen && (
            <div className="absolute inset-0 rounded-full border-2 border-primary/50 scale-110 animate-ping opacity-50"></div>
          )}
          
          <AnimatePresence mode='wait'>
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 90 }}
              >
                <X size={28} className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
              </motion.div>
            ) : (
              <motion.div
                key="cpu"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="relative"
              >
                <Cpu size={28} className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
                <motion.div 
                  className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,1)]"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  style={{ originX: "16px", originY: "16px" }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.button>


      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95, x: 20 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
            exit={{ opacity: 0, y: 20, scale: 0.95, x: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] h-[600px] max-h-[calc(100vh-120px)] rounded-2xl overflow-hidden shadow-2xl flex flex-col glass-panel border border-slate-200 dark:border-white/10"
          >
            {/* Header with History Stats and Analytics Button */}
            <div className="p-4 bg-slate-100/80 dark:bg-[#0F172A]/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-2 h-2 bg-green-500 rounded-full absolute bottom-0 right-0 z-10 ring-2 ring-[#0F172A]" />
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                      <Bot size={20} className="text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      JARVIS <Sparkles size={12} className="text-amber-400" />
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-primary/80 font-mono tracking-wider">SYSTEM ONLINE</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* 📊 ANALYTICS BUTTON - New! */}
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    onClick={() => setShowAnalyticsVault(!showAnalyticsVault)} 
                    className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-primary transition-colors"
                    title="View Analytics Vault"
                  >
                    <BarChart3 size={16} />
                  </motion.button>
                  <button 
                    onClick={clearHistory} 
                    className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-red-500 transition-colors"
                    title="Clear conversation"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              {/* Conversation Stats with Emojis */}
              {messages.length > 1 && (
                <div className="text-xs text-slate-600 dark:text-slate-400 font-mono space-y-0.5">
                  <div>💬 {stats.messageCount} messages</div>
                  <div>🧠 {stats.userQuestions} questions</div>
                  {stats.topics.length > 0 && (
                    <div>Topics: {stats.topics.join(' • ')}</div>
                  )}
                </div>
              )}
            </div>


            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-slate-50/50 dark:bg-[#030014]/60">
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                    msg.role === 'user' 
                      ? 'bg-slate-200 dark:bg-white/10 border-transparent' 
                      : 'bg-primary/10 border-primary/30 text-primary'
                  }`}>
                    {msg.role === 'user' ? <User size={14} className="text-slate-600 dark:text-white" /> : <Bot size={14} />}
                  </div>


                  <div className={`p-3.5 rounded-2xl text-sm leading-relaxed max-w-[85%] shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-primary text-black font-medium rounded-tr-sm' 
                      : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-tl-sm'
                  }`}>
                    {msg.role === 'assistant' 
                      ? renderMessageWithEmojis(msg.content)
                      : msg.content
                    }
                  </div>
                </motion.div>
              ))}


              {/* Enhanced Typing Indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                    <Bot size={14} />
                  </div>
                  
                  <div className="p-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl rounded-tl-sm flex items-center gap-3 h-10">
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
                      Jarvis is thinking...
                    </span>
                  </div>
                </motion.div>
              )}


              <div ref={messagesEndRef} />
            </div>


            {/* Quick Chips Area with Emojis */}
            <div className="px-4 pb-2 pt-3 bg-slate-50 dark:bg-[#0F172A] border-t border-slate-200 dark:border-white/10">
              <div className="flex gap-2 overflow-x-auto thin-scrollbar-x pb-2">
                {suggestions.map((chip, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => processMessage(chip.replace(/^[🚀⚡💼📧📚]\s/, ''))}
                    disabled={isTyping}
                    className="whitespace-nowrap px-3 py-1.5 rounded-full bg-slate-200/50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-primary hover:text-black hover:border-primary dark:hover:border-primary transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {chip}
                  </motion.button>
                ))}
              </div>
            </div>


            {/* Input Area */}
            <form onSubmit={handleFormSubmit} className="p-4 pt-2 bg-slate-50 dark:bg-[#0F172A]">
              <div className="relative flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about projects... 💭"
                  className="w-full pl-4 pr-12 py-3 rounded-xl bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-slate-900 dark:text-white placeholder-slate-400 transition-all text-sm shadow-inner"
                  disabled={isTyping}
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="absolute right-2 p-2 bg-primary text-black rounded-lg hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-primary/20"
                >
                  {isTyping ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📊 Analytics Dashboard Component - New! */}
      <AnalyticsViewer 
        isOpen={showAnalyticsVault}
        onClose={() => setShowAnalyticsVault(false)}
      />
    </>
  );
};


export default Chatbot;