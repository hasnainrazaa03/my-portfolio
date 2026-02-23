import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Zap, ArrowUp, ArrowDown, CornerDownLeft } from 'lucide-react';
import jarvisQnA from '../data/jarvisQnA.json';

/* ── Compact fuzzy scorer (no deps) ──────────────────────────────────────── */

/**
 * Score a query against a target string.
 * Returns 0‑1 where 1 = perfect match.  Combines:
 *  - exact substring bonus
 *  - token-level overlap via Jaccard
 */
export function fuzzyScore(query, target) {
  if (!query || !target) return 0;
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase();

  // Exact substring → strong signal
  if (t.includes(q)) return 1;

  const qTokens = q.split(/\s+/).filter(Boolean);
  const tTokens = t.split(/\s+/).filter(Boolean);

  if (qTokens.length === 0) return 0;

  let matchedTokens = 0;
  for (const qt of qTokens) {
    if (tTokens.some(tt => tt.includes(qt) || qt.includes(tt))) {
      matchedTokens++;
    }
  }

  // Jaccard‑ish: matched / max(setSize)
  return matchedTokens / Math.max(qTokens.length, 1);
}

/**
 * Search the QnA dataset. Returns top‑N results sorted by score.
 */
export function searchQnA(query, topN = 5) {
  if (!query || query.trim().length < 2) return [];

  const scored = jarvisQnA.qaData.map(item => {
    const qScore = fuzzyScore(query, item.q);
    const aScore = fuzzyScore(query, item.a) * 0.6; // answer match weighted less
    return { ...item, score: Math.max(qScore, aScore) };
  });

  return scored
    .filter(r => r.score > 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

/* ── Confidence threshold for auto‑suggest ─────────────────────────────── */
export const AUTO_SUGGEST_THRESHOLD = 0.75;

/* ── Component ───────────────────────────────────────────────────────────── */

const QnASearch = ({ onUseAnswer, onAskLive, disabled }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Debounced search (200ms)
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }

    debounceRef.current = setTimeout(() => {
      setResults(searchQnA(query));
      setSelectedIdx(0);
    }, 200);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleKeyDown = useCallback((e) => {
    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      e.preventDefault();
      onUseAnswer?.(results[selectedIdx].q, results[selectedIdx].a);
      setQuery('');
    }
  }, [results, selectedIdx, onUseAnswer]);

  const topMatch = results[0];
  const hasGoodMatch = topMatch && topMatch.score >= AUTO_SUGGEST_THRESHOLD;

  return (
    <div className="relative">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
        <Search size={14} className="text-slate-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search Q&A…"
          className="flex-1 bg-transparent outline-none text-sm text-slate-900 dark:text-white placeholder-slate-400"
          disabled={disabled}
          aria-label="Search local Q&A knowledge base"
          aria-autocomplete="list"
          aria-controls="qna-results"
          role="combobox"
          aria-expanded={results.length > 0}
        />
        {query && (
          <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs px-1" aria-label="Clear search">✕</button>
        )}
      </div>

      {/* Keyboard hint */}
      {results.length > 0 && (
        <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-slate-400 dark:text-slate-500">
          <ArrowUp size={10} /><ArrowDown size={10} /> navigate
          <CornerDownLeft size={10} className="ml-1" /> select
        </div>
      )}

      {/* Results dropdown */}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.ul
            id="qna-results"
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-1 max-h-48 overflow-y-auto rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-lg divide-y divide-slate-100 dark:divide-white/5"
          >
            {results.map((r, idx) => (
              <li
                key={idx}
                role="option"
                aria-selected={idx === selectedIdx}
                onClick={() => {
                  onUseAnswer?.(r.q, r.a);
                  setQuery('');
                }}
                className={`px-3 py-2 cursor-pointer text-sm transition-colors ${
                  idx === selectedIdx
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <div className="font-medium text-xs truncate">{r.q}</div>
                <div className="text-[11px] opacity-70 truncate mt-0.5">{r.a.substring(0, 80)}…</div>
                <div className="text-[10px] opacity-40 mt-0.5">Confidence: {Math.round(r.score * 100)}%</div>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      {/* Action buttons when query present */}
      {query.trim().length >= 2 && (
        <div className="flex gap-2 mt-2">
          {hasGoodMatch && (
            <button
              onClick={() => { onUseAnswer?.(topMatch.q, topMatch.a); setQuery(''); }}
              className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 font-medium transition-colors border border-primary/20"
            >
              Use local answer
            </button>
          )}
          <button
            onClick={() => { onAskLive?.(query); setQuery(''); }}
            className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 font-medium transition-colors border border-purple-500/20 flex items-center justify-center gap-1"
          >
            <Zap size={12} /> Ask live (Gemini)
          </button>
        </div>
      )}
    </div>
  );
};

export default QnASearch;
