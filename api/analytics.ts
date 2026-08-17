import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { randomUUID, timingSafeEqual as nodeTimingSafeEqual } from 'node:crypto';
import { applyCors } from './_lib/cors.js';
import { captureServerError, flushSentry } from './_lib/sentry.js';
import { usableSecret } from './_lib/secrets.js';

/**
 * Supabase client is created LAZILY. At module scope, `createClient` runs on
 * every cold start — including for requests that never touch the database
 * (OPTIONS preflights, 401s, 429s) — and it throws on missing env vars, which
 * surfaces as an opaque 500 for the whole function rather than a clear error.
 * Deferring it means a misconfigured deploy fails only the DB path, with a
 * message that says what's actually wrong.
 */
function getSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not configured');
  }
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * PRIVACY POSTURE
 *  - Raw IP addresses are NEVER stored. IPs are SHA-256 hashed with a
 *    per-deploy salt (ANALYTICS_IP_SALT) before reaching the database.
 *  - We no longer store userAgent or referrer (the client also no longer
 *    sends them — see src/services/analyticsService.js).
 *  - DB columns user_agent / referrer / ip_address are written as the
 *    constant string 'redacted' (or the IP hash, for ip_address) to keep
 *    the existing table schema valid without exposing PII.
 */

/** A row of the `jarvis_analytics` table, as consumed by the insights pass. */
interface AnalyticsRow {
  question?: string | null;
  session_id?: string | null;
  timestamp: string;
}

/** Keyed occurrence counts (topics, entities, hour buckets). */
type Counter = Record<string, number>;

function safeEq(a: unknown, b: unknown): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return nodeTimingSafeEqual(ab, bb);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Correlation ID for log/trace stitching. Echo on every response.
  const requestId = randomUUID();
  res.setHeader('x-request-id', requestId);

  applyCors(req, res, {
    methods: 'GET, OPTIONS',
    headers: 'Content-Type, Authorization',
  });

  if (req.method === 'OPTIONS') return res.status(200).end();

  /**
   * ── WRITES ARE GONE ──────────────────────────────────────────────────────
   *
   * There used to be a POST branch here, gated by `ANALYTICS_WRITE_TOKEN` and
   * called from the browser with the matching `VITE_ANALYTICS_WRITE_TOKEN`.
   * That token was inlined into the shipped bundle by design and could be
   * lifted out of it in seconds, so the gate stopped only people who could not
   * be bothered — while the endpoint itself accepted arbitrary rows into the
   * table the admin viewer reads.
   *
   * The endpoint was never needed. Every row analytics ever stored was a chat
   * (question, response) pair, and /api/chat already holds both — it answered
   * the question and produced the response. It now writes the row itself with
   * the service key that never leaves the server (api/_lib/analyticsLog.ts).
   *
   * So the credential is not better protected, it no longer exists. A POST here
   * is now simply not a route.
   *
   * Older cached bundles may still POST for a while; they get 405 and fail soft
   * (the client warns and keeps the interaction in localStorage), and because
   * this branch is gone there is no window where a row could be double-counted.
   */
  if (req.method === 'POST') {
    return res.status(405).json({
      error: 'Analytics writes are recorded server-side by /api/chat',
      requestId,
    });
  }

  // ── READ ─────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const authHeader = req.headers.authorization || '';
      const expectedToken = usableSecret(
        process.env.ANALYTICS_SECRET_TOKEN,
        'ANALYTICS_SECRET_TOKEN',
      );
      const expectedHeader = expectedToken ? `Bearer ${expectedToken}` : null;

      if (!expectedHeader || !safeEq(authHeader, expectedHeader)) {
        return res
          .status(401)
          .json({ error: 'Unauthorized', message: 'Provide the analytics secret token', requestId });
      }

      const { data, error } = await getSupabase()
        .from('jarvis_analytics')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1000);

      if (error) {
        console.error(`[analytics][${requestId}] Supabase fetch error:`, error.message);
        return res.status(500).json({ error: 'Failed to fetch analytics', requestId });
      }

      return res.status(200).json({
        success: true,
        total: data.length,
        data,
        insights: processAnalyticsData(data),
        requestId,
      });
    } catch (err) {
      console.error(`[analytics][${requestId}] read error:`, err);
      await captureServerError(err, { requestId, route: '/api/analytics:read' });
      await flushSentry();
      return res.status(500).json({ error: 'Internal error', requestId });
    }
  }

  return res.status(405).json({ error: 'Method not allowed', requestId });
}

// ── Insights (unchanged shape) ─────────────────────────────────────────────
function processAnalyticsData(data: AnalyticsRow[]) {
  if (!data || data.length === 0) {
    return {
      totalSessions: 0,
      totalQuestions: 0,
      topicBreakdown: {},
      mostAskedTopics: [],
      entityMentions: {},
      hourlyBreakdown: {},
    };
  }

  const topicBreakdown: Counter = {};
  const entityMentions: Counter = {};
  const hourlyBreakdown: Counter = {};

  data.forEach((interaction: AnalyticsRow) => {
    const topics = extractTopics(interaction.question);
    const entities = extractEntities(interaction.question);
    const hour = new Date(interaction.timestamp).getHours();
    topics.forEach((t) => (topicBreakdown[t] = (topicBreakdown[t] || 0) + 1));
    entities.forEach((e) => (entityMentions[e] = (entityMentions[e] || 0) + 1));
    hourlyBreakdown[`${hour}:00`] = (hourlyBreakdown[`${hour}:00`] || 0) + 1;
  });

  const mostAskedTopics = Object.entries(topicBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic, count]) => ({ topic, count }));

  const topEntities = Object.entries(entityMentions).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const uniqueSessions = new Set(data.map((d: AnalyticsRow) => d.session_id)).size;

  return {
    totalSessions: uniqueSessions,
    totalQuestions: data.length,
    topicBreakdown,
    mostAskedTopics,
    entityMentions: topEntities,
    hourlyBreakdown,
  };
}

function extractTopics(question: unknown): string[] {
  const lower = String(question || '').toLowerCase();
  const topics: string[] = [];
  if (/(project|vimaan|tumor|brain)/.test(lower)) topics.push('projects');
  if (/(skill|tech|language|proficient)/.test(lower)) topics.push('skills');
  if (/(experience|work|deloitte|drdo|prana)/.test(lower)) topics.push('experience');
  if (/(education|usc|rvce|university|degree)/.test(lower)) topics.push('education');
  if (/(contact|email|reach|linkedin|github)/.test(lower)) topics.push('contact');
  if (/(ai|machine learning|\bml\b|deep learning)/.test(lower)) topics.push('ai_ml');
  if (/(aerospace|cfd|aerodynamic|flight)/.test(lower)) topics.push('aerospace');
  return topics;
}

function extractEntities(question: unknown): string[] {
  const lower = String(question || '').toLowerCase();
  const entities: string[] = [];
  const dict = [
    'vimaan', 'brain tumor', 'segmentation', 'recipe vault', 'expense tracker', 'cfd', 'aerodynamic',
    'python', 'pytorch', 'tensorflow', 'react', 'nodejs', 'matlab', 'sql', 'java', 'cpp', 'javascript',
    'deloitte', 'drdo', 'prana', 'usc', 'rvce', 'liba space',
  ];
  dict.forEach((d) => { if (lower.includes(d)) entities.push(d); });
  return [...new Set(entities)];
}
