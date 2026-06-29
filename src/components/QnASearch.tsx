import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Zap, ArrowUp, ArrowDown, CornerDownLeft } from 'lucide-react';
import jarvisQnA from '../data/jarvisQnA.json';

interface QnAItem { q: string; a: string; }
interface QnAResult extends QnAItem { score: number; }
interface DocVector { vec: Map<string, number>; norm: number; }
interface TfIdfIndex { idf: Map<string, number>; vectors: DocVector[]; }

/* ── Compact fuzzy scorer (no deps) ──────────────────────────────────────── */

/**
 * Score a query against a target string.
 * Returns 0‑1 where 1 = perfect match.  Combines:
 *  - exact substring bonus
 *  - token-level overlap via Jaccard
 */
export function fuzzyScore(query: string, target: string): number {
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

/* ── TF-IDF + bigram cosine (lightweight "semantic" upgrade) ─────────────
 * No embeddings, no network — we tokenise question+answer fields, build a
 * corpus-wide IDF on first use, and score queries with cosine similarity
 * over unigrams + bigrams. Strictly additive on top of `fuzzyScore` — the
 * old function still returns identical values for existing callers/tests.
 * ─────────────────────────────────────────────────────────────────────── */

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'is', 'in', 'on', 'for',
  'with', 'at', 'by', 'this', 'that', 'as', 'are', 'was', 'were', 'be',
  'do', 'does', 'did', 'have', 'has', 'had', 'i', 'you', 'me', 'my',
  'your', 'we', 'our', 'us', 'it', 'its', 'about', 'what', 'who', 'how',
]);

function tokenize(str: string): string[] {
  return String(str || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function bigrams(tokens: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    out.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return out;
}

function termsOf(str: string): string[] {
  const t = tokenize(str);
  return [...t, ...bigrams(t)];
}

// Lazily-built TF-IDF index over the Q&A corpus.
let _index: TfIdfIndex | null = null;
function getIndex(): TfIdfIndex {
  if (_index) return _index;
  const docs = (jarvisQnA.qaData || []).map((item) =>
    termsOf(`${item.q} ${item.q} ${item.a}`) // weight question 2x
  );
  const df = new Map<string, number>();
  for (const doc of docs) {
    const seen = new Set(doc);
    for (const term of seen) df.set(term, (df.get(term) || 0) + 1);
  }
  const N = Math.max(docs.length, 1);
  const idf = new Map<string, number>();
  for (const [term, count] of df) {
    idf.set(term, Math.log(1 + N / count));
  }
  const vectors = docs.map((terms) => vectorize(terms, idf));
  _index = { idf, vectors };
  return _index;
}

function vectorize(terms: string[], idf: Map<string, number>): DocVector {
  const tf = new Map<string, number>();
  for (const t of terms) tf.set(t, (tf.get(t) || 0) + 1);
  const vec = new Map<string, number>();
  let norm = 0;
  for (const [term, count] of tf) {
    const w = (1 + Math.log(count)) * (idf.get(term) || 0);
    if (w > 0) {
      vec.set(term, w);
      norm += w * w;
    }
  }
  return { vec, norm: Math.sqrt(norm) || 1 };
}

function cosine(a: DocVector, b: DocVector): number {
  // Iterate the smaller map for speed.
  const [small, large] = a.vec.size < b.vec.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [term, w] of small.vec) {
    const w2 = large.vec.get(term);
    if (w2) dot += w * w2;
  }
  return dot / (a.norm * b.norm);
}

/**
 * Cosine similarity of `query` against the indexed Q&A document at `idx`.
 * Returns 0–1.
 */
export function tfidfScore(query: string, idx: number): number {
  const { idf, vectors } = getIndex();
  if (idx < 0 || idx >= vectors.length) return 0;
  const qVec = vectorize(termsOf(query), idf);
  if (qVec.norm === 0) return 0;
  return Math.max(0, Math.min(1, cosine(qVec, vectors[idx])));
}

/**
 * Search the QnA dataset. Returns top‑N results sorted by score.
 * Blends fuzzy substring matching with TF-IDF cosine — the higher wins.
 */
export function searchQnA(query: string, topN = 5): QnAResult[] {
  if (!query || query.trim().length < 2) return [];

  const scored = jarvisQnA.qaData.map((item, idx) => {
    const fuzzyQ = fuzzyScore(query, item.q);
    const fuzzyA = fuzzyScore(query, item.a) * 0.6;
    const semantic = tfidfScore(query, idx);
    const score = Math.max(fuzzyQ, fuzzyA, semantic);
    return { ...item, score };
  });

  return scored
    .filter(r => r.score > 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

/* ── Confidence threshold for auto‑suggest ─────────────────────────────── */
export const AUTO_SUGGEST_THRESHOLD = 0.75;

/* ── Component ───────────────────────────────────────────────────────────── */

interface QnASearchProps {
  onUseAnswer?: (question: string, answer: string) => void;
  onAskLive?: (query: string) => void;
  disabled?: boolean;
}

const QnASearch = ({ onUseAnswer, onAskLive, disabled }: QnASearchProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<QnAResult[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
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
        <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-slate-500 dark:text-slate-300">
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
                tabIndex={0}
                onClick={() => {
                  onUseAnswer?.(r.q, r.a);
                  setQuery('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onUseAnswer?.(r.q, r.a);
                    setQuery('');
                  }
                }}
                className={`px-3 py-2 cursor-pointer text-sm transition-colors ${
                  idx === selectedIdx
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <div className="font-medium text-xs truncate">{r.q}</div>
                <div className="text-[11px] opacity-70 truncate mt-0.5">{r.a.substring(0, 80)}…</div>
                <div className="text-[10px] opacity-70 mt-0.5">Confidence: {Math.round(r.score * 100)}%</div>
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
            <Zap size={12} /> Ask live
          </button>
        </div>
      )}
    </div>
  );
};

export default QnASearch;
