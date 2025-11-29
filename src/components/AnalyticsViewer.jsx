import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Trash2, RefreshCw, Eye } from 'lucide-react';

/**
 * Retrieve all stored analytics from localStorage
 * Reads every analytics session saved in the browser
 * 📁 Location: src/components/AnalyticsViewer.jsx
 */
const getAllStoredAnalytics = () => {
  const allData = [];
  const keys = Object.keys(localStorage);
  
  // Loop through all localStorage keys
  keys.forEach(key => {
    // Only get keys that start with 'jarvis_analytics_'
    if (key.startsWith('jarvis_analytics_')) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        allData.push(...data);
      } catch (e) {
        console.warn(`Failed to parse ${key}:`, e);
      }
    }
  });
  
  return allData;
};

/**
 * Aggregate analytics from all sessions
 * Combines data from multiple sessions into one summary
 */
const aggregateAnalytics = (allInteractions) => {
  if (allInteractions.length === 0) {
    return {
      totalSessions: 0,
      totalChats: 0,
      totalQuestions: 0,
      dateRange: 'No data',
      topTopics: [],
      topEntities: {},
      mostCommonQuestions: [],
      uniqueVisitors: 0
    };
  }

  // Group by session
  const sessions = {};
  allInteractions.forEach(interaction => {
    if (!sessions[interaction.sessionId]) {
      sessions[interaction.sessionId] = [];
    }
    sessions[interaction.sessionId].push(interaction);
  });

  const totalSessions = Object.keys(sessions).length;
  const totalChats = allInteractions.length;
  const totalQuestions = allInteractions.filter(i => i.role === 'user').length;

  // Extract date range
  const timestamps = allInteractions.map(i => new Date(i.timestamp).getTime());
  const minDate = new Date(Math.min(...timestamps)).toLocaleDateString();
  const maxDate = new Date(Math.max(...timestamps)).toLocaleDateString();

  // Find most common questions
  const questionCounts = {};
  allInteractions
    .filter(i => i.role === 'user')
    .forEach(interaction => {
      const question = interaction.question.toLowerCase().slice(0, 50);
      questionCounts[question] = (questionCounts[question] || 0) + 1;
    });

  const mostCommonQuestions = Object.entries(questionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([q, count]) => ({ question: q, count }));

  return {
    totalSessions,
    totalChats,
    totalQuestions,
    dateRange: minDate === maxDate ? minDate : `${minDate} to ${maxDate}`,
    mostCommonQuestions
  };
};

const AnalyticsViewer = ({ isOpen, onClose }) => {
  const [allData, setAllData] = useState([]);
  const [aggregated, setAggregated] = useState(null);

  // When dashboard opens, load analytics
  useEffect(() => {
    if (isOpen) {
      refreshData();
    }
  }, [isOpen]);

  // Refresh analytics from storage
  const refreshData = () => {
    const data = getAllStoredAnalytics();
    setAllData(data);
    setAggregated(aggregateAnalytics(data));
  };

  // Export all analytics as JSON file
  const handleExportAll = () => {
    const exportData = {
      exportTime: new Date().toISOString(),
      totalSessions: aggregated.totalSessions,
      totalChats: aggregated.totalChats,
      summary: aggregated,
      allInteractions: allData
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jarvis-analytics-all-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export all analytics as CSV (Excel format)
  const handleExportCSV = () => {
    // CSV headers
    const headers = ['Timestamp', 'Question', 'Response Preview', 'Session ID'];
    const rows = allData.map(d => [
      new Date(d.timestamp).toLocaleString(),
      d.question.slice(0, 50),
      d.response.slice(0, 50),
      d.sessionId
    ]);

    // Create CSV string
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Download as file
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jarvis-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Clear all analytics data
  const handleClearAll = () => {
    if (confirm('🚨 Clear ALL analytics data from localStorage? This cannot be undone!')) {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('jarvis_analytics_')) {
          localStorage.removeItem(key);
        }
      });
      setAllData([]);
      setAggregated(null);
    }
  };

  // Show empty state if no data
  if (!aggregated || aggregated.totalChats === 0) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="fixed bottom-24 left-6 z-50 w-[400px] max-w-[calc(100vw-48px)] rounded-2xl shadow-2xl glass-panel border border-slate-200 dark:border-white/10 overflow-hidden"
          >
            <div className="p-4 bg-slate-100/80 dark:bg-[#0F172A]/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white">📊 Analytics Vault</h3>
              <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg">
                <X size={16} />
              </button>
            </div>
            <div className="p-8 text-center">
              <Eye size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <p className="text-slate-600 dark:text-slate-300 font-medium">
                No analytics data yet
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Chat with Jarvis to collect analytics 💬
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Show full analytics dashboard
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-24 left-6 z-50 w-[440px] max-w-[calc(100vw-48px)] max-h-[700px] rounded-2xl shadow-2xl flex flex-col glass-panel border border-slate-200 dark:border-white/10 overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 bg-slate-100/80 dark:bg-[#0F172A]/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white">📊 Analytics Vault</h3>
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                onClick={refreshData}
                className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg text-slate-400 hover:text-primary transition-colors"
                title="Refresh"
              >
                <RefreshCw size={16} />
              </motion.button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-lg bg-slate-50/50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <div className="text-xs text-slate-600 dark:text-slate-400">📊 Sessions</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {aggregated.totalSessions}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50/50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <div className="text-xs text-slate-600 dark:text-slate-400">💬 Total Chats</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {aggregated.totalChats}
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div className="p-3 rounded-lg bg-slate-50/50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <div className="text-xs text-slate-600 dark:text-slate-400 font-mono">📅 Date Range</div>
              <div className="text-sm font-medium text-slate-900 dark:text-white mt-1">
                {aggregated.dateRange}
              </div>
            </div>

            {/* Top Questions */}
            {aggregated.mostCommonQuestions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">🔝 Top Questions</h4>
                <div className="space-y-1">
                  {aggregated.mostCommonQuestions.map((item, idx) => (
                    <div
                      key={idx}
                      className="text-xs p-2 rounded-lg bg-slate-50/50 dark:bg-white/5 border border-slate-200 dark:border-white/10"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-slate-700 dark:text-slate-300 flex-1">
                          {item.question}...
                        </span>
                        <span className="ml-2 px-2 py-1 rounded bg-primary/20 text-primary text-xs font-mono">
                          ×{item.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="text-xs text-slate-600 dark:text-slate-400 p-3 rounded-lg bg-slate-50/50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <p className="font-mono">
                ✅ All data stored locally in your browser<br/>
                🔒 Only accessible from this device<br/>
                💾 Persists across page refreshes
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-3 bg-slate-50/50 dark:bg-white/5 border-t border-slate-200 dark:border-white/10 flex flex-col gap-2">
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleExportAll}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary/80 text-black font-medium hover:bg-primary transition-colors text-sm"
              >
                <Download size={14} /> JSON
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleExportCSV}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary/80 text-black font-medium hover:bg-primary transition-colors text-sm"
              >
                <Download size={14} /> CSV
              </motion.button>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleClearAll}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/30 font-medium transition-colors text-sm"
            >
              <Trash2 size={14} /> Clear All Data
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AnalyticsViewer;
