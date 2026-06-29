import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Trash2, RefreshCw, Eye, Lock } from 'lucide-react';
import { analyticsService } from '../services/analyticsService';

// SECURITY: Admin token is held in sessionStorage (not localStorage) so it
// is cleared when the browser is closed and is NOT shared across tabs by
// default. The token is also entered via an in-page <input type="password">
// rather than window.prompt(), which is dismissable / spoofable and was
// previously the only auth gate.
const TOKEN_STORAGE_KEY = 'jarvis_analytics_token';

interface AnalyticsViewerProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

// Permissive shape — the panel renders a union of the local summary and the
// backend `insights` object (admin-only debug view).
interface AggregatedAnalytics {
  totalSessions?: number;
  totalQuestions?: number;
  totalInteractions?: number;
  dateRange?: string;
  mostAskedTopics?: Array<{ topic: string; count: number }>;
  entityMentions?: Array<[string, number]>;
  hourlyBreakdown?: Record<string, number>;
}

interface BackendResult {
  success?: boolean;
  insights?: AggregatedAnalytics;
  data?: unknown;
}

const AnalyticsViewer = ({ isOpen, onClose, className = '' }: AnalyticsViewerProps) => {
  const [aggregated, setAggregated] = useState<AggregatedAnalytics | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [authToken, setAuthToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const token = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      setAuthToken(token);
      setIsOwner(true);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (isOwner && authToken) {
        loadBackendAnalytics();
      } else {
        loadLocalAnalytics();
      }
    }
    // loadBackendAnalytics / loadLocalAnalytics are stable closures defined
    // in this component; wrapping them in useCallback would cascade through
    // setState calls and add no real benefit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isOwner, authToken]);

  const loadBackendAnalytics = async () => {
    setIsLoading(true);
    try {
      const result = (await analyticsService.fetchAnalyticsFromBackend(authToken)) as BackendResult | null;
      if (result && result.success) {
        setAggregated(result.insights ?? null);
      } else {
        loadLocalAnalytics();
      }
    } catch (error) {
      console.error('Failed to load backend analytics:', error);
      loadLocalAnalytics();
    } finally {
      setIsLoading(false);
    }
  };

  const loadLocalAnalytics = () => {
    const localSummary = analyticsService.getLocalAnalytics();
    setAggregated(localSummary as unknown as AggregatedAnalytics);
  };

  const handleAuthenticate = async (e: React.FormEvent<HTMLFormElement>) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    setAuthError('');
    const token = tokenInput.trim();
    if (!token) {
      setAuthError('Please enter a token.');
      return;
    }
    // Validate the token immediately by attempting a backend fetch.
    setIsLoading(true);
    try {
      const result = (await analyticsService.fetchAnalyticsFromBackend(token)) as BackendResult | null;
      if (result && result.success) {
        sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
        setAuthToken(token);
        setIsOwner(true);
        setAggregated(result.insights ?? null);
        setTokenInput('');
      } else {
        setAuthError('Invalid token.');
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      setAuthError('Could not verify token. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    setAuthToken('');
    setIsOwner(false);
    loadLocalAnalytics();
  };

  const handleExportLocal = () => {
    const data = analyticsService.exportAsJSON();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jarvis-analytics-local-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportAll = async () => {
    if (!isOwner) {
      alert('You must be authenticated as the owner to export all analytics.');
      return;
    }

    const result = (await analyticsService.fetchAnalyticsFromBackend(authToken)) as BackendResult | null;
    if (result && result.success) {
      const exportData = {
        exportTime: new Date().toISOString(),
        totalSessions: result.insights?.totalSessions,
        totalQuestions: result.insights?.totalQuestions,
        summary: result.insights,
        allInteractions: result.data
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
    }
  };

  const handleClearLocal = () => {
    if (confirm('Clear your local analytics data?')) {
      analyticsService.clearAnalytics();
      loadLocalAnalytics();
    }
  };

  if (!isOwner) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={`fixed bottom-24 left-6 z-50 w-[400px] max-w-[calc(100vw-48px)] rounded-2xl shadow-2xl glass-panel border border-slate-200 dark:border-white/10 overflow-hidden ${className}`}
          >
            <div className="p-4 bg-slate-100/80 dark:bg-[#0F172A]/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Lock size={16} /> Analytics Vault
              </h3>
            </div>
            
            <div className="p-6 text-center">
              <Lock size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <p className="text-slate-600 dark:text-slate-300 font-medium mb-4">
                This analytics vault is password-protected
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                Only the portfolio owner can access visitor analytics
              </p>

              <form onSubmit={handleAuthenticate} className="space-y-3 text-left">
                <label htmlFor="analytics-token" className="sr-only">
                  Analytics secret token
                </label>
                <input
                  id="analytics-token"
                  type="password"
                  autoComplete="current-password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Paste secret token"
                  className="w-full px-3 py-2 rounded-lg bg-white/80 dark:bg-[#0F172A]/80 border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {authError && (
                  <p role="alert" className="text-xs text-red-500">{authError}</p>
                )}
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full px-4 py-3 bg-gradient-to-r from-primary to-blue-600 text-black font-bold rounded-lg shadow-lg hover:shadow-[0_0_30px_rgba(45,212,191,0.6)] transition-all"
                >
                  🔐 Unlock
                </motion.button>
              </form>

              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  You can still view your personal chat history below
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50/50 dark:bg-[#030014]/60 max-h-64 overflow-y-auto">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Your Local Analytics</h4>
              {analyticsService.getLocalAnalytics().totalInteractions === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">No local data yet</p>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    💬 {analyticsService.getLocalAnalytics().totalInteractions} messages
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleExportLocal}
                      className="flex-1 px-3 py-2 bg-primary/20 text-primary rounded text-xs font-medium"
                    >
                      Export Local
                    </button>
                    <button
                      onClick={handleClearLocal}
                      className="flex-1 px-3 py-2 bg-red-500/20 text-red-500 rounded text-xs font-medium"
                    >
                      Clear Local
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  if (isLoading) {
    return (
      <AnimatePresence>
        {isOpen && (
          <div className={`fixed bottom-24 left-6 z-50 w-[400px] max-w-[calc(100vw-48px)] rounded-2xl shadow-2xl glass-panel border border-slate-200 dark:border-white/10 p-8 text-center ${className}`}>
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-300">Loading analytics...</p>
          </div>
        )}
      </AnimatePresence>
    );
  }

  if (!aggregated) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={`fixed bottom-24 left-6 z-50 w-[440px] max-w-[calc(100vw-48px)] max-h-[700px] rounded-2xl shadow-2xl flex flex-col glass-panel border border-slate-200 dark:border-white/10 overflow-hidden ${className}`}
        >
          <div className="p-4 bg-slate-100/80 dark:bg-[#0F172A]/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Eye size={16} /> 📊 Owner Analytics
              </h3>
              <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg">
                <X size={16} />
              </button>
            </div>
            <div className="text-xs text-green-600 dark:text-green-400 font-mono flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Authenticated as Owner
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
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
                  {aggregated.totalQuestions}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50/50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <div className="text-xs text-slate-600 dark:text-slate-400 font-mono">📅 Date Range</div>
              <div className="text-sm font-medium text-slate-900 dark:text-white mt-1">
                {aggregated.dateRange}
              </div>
            </div>

            {aggregated.mostAskedTopics && aggregated.mostAskedTopics.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">🔝 Top Topics</h4>
                <div className="space-y-2">
                  {aggregated.mostAskedTopics.map((item, idx) => (
                    <div
                      key={idx}
                      className="text-xs p-2 rounded-lg bg-slate-50/50 dark:bg-white/5 border border-slate-200 dark:border-white/10"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-slate-700 dark:text-slate-300 capitalize flex-1">
                          🏷️ {item.topic.replace('_', ' ')}
                        </span>
                        <span className="ml-2 px-2 py-1 rounded bg-primary/20 text-primary text-xs font-mono">
                          {item.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {aggregated.entityMentions && aggregated.entityMentions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">🎯 Most Mentioned</h4>
                <div className="flex flex-wrap gap-2">
                  {aggregated.entityMentions.slice(0, 8).map(([entity, count], idx) => (
                    <div
                      key={idx}
                      className="text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 text-slate-900 dark:text-white font-medium"
                    >
                      {entity} <span className="opacity-60">({count})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {aggregated.hourlyBreakdown && Object.keys(aggregated.hourlyBreakdown).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">⏰ Hourly Activity</h4>
                <div className="text-xs font-mono space-y-1">
                  {Object.entries(aggregated.hourlyBreakdown)
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([hour, count], idx) => (
                      <div key={idx} className="flex justify-between p-1 rounded hover:bg-slate-100/50 dark:hover:bg-white/5">
                        <span>{hour}</span>
                        <span className="bg-primary/20 text-primary px-2 rounded">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-50/50 dark:bg-white/5 border-t border-slate-200 dark:border-white/10 flex flex-col gap-2">
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleExportAll}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary/80 text-black font-medium hover:bg-primary transition-colors text-sm"
              >
                <Download size={14} /> Export All
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleExportLocal}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary/60 text-black font-medium hover:bg-primary transition-colors text-sm"
              >
                <Download size={14} /> Local
              </motion.button>
            </div>
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLogout}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/30 font-medium transition-colors text-sm"
              >
                <Lock size={14} /> Logout
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AnalyticsViewer;
