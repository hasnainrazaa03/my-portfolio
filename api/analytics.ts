import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { randomUUID, timingSafeEqual as nodeTimingSafeEqual } from 'node:crypto';
import { applyCors } from './_lib/cors';
import { createRateLimiter, getClientIp } from './_lib/rateLimit';
import { hashIp } from './_lib/hashIp';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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

const writeLimiter = createRateLimiter({ windowMs: 60_000, max: 30 });

function safeEq(a, b) {
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
    methods: 'POST, GET, OPTIONS',
    headers: 'Content-Type, Authorization, x-analytics-token',
  });

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── WRITE ────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const expectedWriteToken = process.env.ANALYTICS_WRITE_TOKEN;
    const writeToken = req.headers['x-analytics-token'];

    if (!expectedWriteToken) {
      console.warn(`[analytics][${requestId}] ANALYTICS_WRITE_TOKEN not set — rejecting writes`);
      return res.status(500).json({ error: 'Server misconfigured', requestId });
    }
    if (!safeEq(writeToken, expectedWriteToken)) {
      return res.status(401).json({ error: 'Unauthorized', requestId });
    }

    const clientIp = getClientIp(req);
    const { limited } = writeLimiter(clientIp);
    if (limited) return res.status(429).json({ error: 'Too many requests', requestId });

    try {
      const { question, response, sessionId, timestamp } = req.body || {};
      if (!question || !response) {
        return res.status(400).json({ error: 'Missing required fields', requestId });
      }

      const { data, error } = await supabase.from('jarvis_analytics').insert([
        {
          id: randomUUID(),
          question: String(question).slice(0, 1000),
          response: String(response).slice(0, 4000),
          session_id: typeof sessionId === 'string' ? sessionId.slice(0, 64) : null,
          timestamp: timestamp || new Date().toISOString(),
          user_agent: 'redacted',
          referrer: 'redacted',
          ip_address: hashIp(clientIp), // hashed, not raw
        },
      ]);

      if (error) {
        console.error(`[analytics][${requestId}] Supabase insert error:`, error.message);
        return res.status(500).json({ error: 'Failed to record analytics', requestId });
      }
      return res.status(200).json({ success: true, data, requestId });
    } catch (err) {
      console.error(`[analytics][${requestId}] write error:`, err);
      return res.status(500).json({ error: 'Internal error', requestId });
    }
  }

  // ── READ ─────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const authHeader = req.headers.authorization || '';
      const expectedToken = process.env.ANALYTICS_SECRET_TOKEN;
      const expectedHeader = expectedToken ? `Bearer ${expectedToken}` : null;

      if (!expectedHeader || !safeEq(authHeader, expectedHeader)) {
        return res
          .status(401)
          .json({ error: 'Unauthorized', message: 'Provide the analytics secret token', requestId });
      }

      const { data, error } = await supabase
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
      return res.status(500).json({ error: 'Internal error', requestId });
    }
  }

  return res.status(405).json({ error: 'Method not allowed', requestId });
}

// ── Insights (unchanged shape) ─────────────────────────────────────────────
function processAnalyticsData(data) {
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

  const topicBreakdown = {};
  const entityMentions = {};
  const hourlyBreakdown = {};

  data.forEach((interaction) => {
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
  const uniqueSessions = new Set(data.map((d) => d.session_id)).size;

  return {
    totalSessions: uniqueSessions,
    totalQuestions: data.length,
    topicBreakdown,
    mostAskedTopics,
    entityMentions: topEntities,
    hourlyBreakdown,
  };
}

function extractTopics(question) {
  const lower = String(question || '').toLowerCase();
  const topics = [];
  if (/(project|vimaan|tumor|brain)/.test(lower)) topics.push('projects');
  if (/(skill|tech|language|proficient)/.test(lower)) topics.push('skills');
  if (/(experience|work|deloitte|drdo|prana)/.test(lower)) topics.push('experience');
  if (/(education|usc|rvce|university|degree)/.test(lower)) topics.push('education');
  if (/(contact|email|reach|linkedin|github)/.test(lower)) topics.push('contact');
  if (/(ai|machine learning|\bml\b|deep learning)/.test(lower)) topics.push('ai_ml');
  if (/(aerospace|cfd|aerodynamic|flight)/.test(lower)) topics.push('aerospace');
  return topics;
}

function extractEntities(question) {
  const lower = String(question || '').toLowerCase();
  const entities = [];
  const dict = [
    'vimaan', 'brain tumor', 'segmentation', 'recipe vault', 'expense tracker', 'cfd', 'aerodynamic',
    'python', 'pytorch', 'tensorflow', 'react', 'nodejs', 'matlab', 'sql', 'java', 'cpp', 'javascript',
    'deloitte', 'drdo', 'prana', 'usc', 'rvce', 'liba space',
  ];
  dict.forEach((d) => { if (lower.includes(d)) entities.push(d); });
  return [...new Set(entities)];
}
