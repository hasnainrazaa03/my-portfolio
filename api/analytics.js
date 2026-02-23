import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// TODO: Replace with your actual deployed domain before production deploy.
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://yourdomain.com';

// --- Basic in-memory rate limiter (per cold-start instance) ---
// NOTE: On Vercel serverless each invocation may be a fresh instance,
// so this only limits burst abuse within a single warm instance.
// For production, use Vercel Edge Middleware or a third-party rate-limiter
// (e.g., Upstash @upstash/ratelimit) for persistent, distributed limiting.
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 30; // max writes per IP per window
const rateLimitMap = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return false;
  }
  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX) {
    return true;
  }
  return false;
}

/**
 * Constant-time string comparison to prevent timing attacks on token checks.
 */
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-analytics-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

    if (req.method === 'POST') {
        // --- Write auth: require x-analytics-token header ---
        // TODO: Set ANALYTICS_WRITE_TOKEN env var on your deployment platform.
        const writeToken = req.headers['x-analytics-token'];
        const expectedWriteToken = process.env.ANALYTICS_WRITE_TOKEN;

        if (!expectedWriteToken) {
          console.warn('[analytics] ANALYTICS_WRITE_TOKEN env var not set — rejecting all writes');
          return res.status(500).json({ error: 'Server misconfigured: write token not set' });
        }

        if (!writeToken || !timingSafeEqual(writeToken, expectedWriteToken)) {
          return res.status(401).json({ error: 'Unauthorized: invalid or missing analytics write token' });
        }

        // Rate limiting
        const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
        if (isRateLimited(clientIp)) {
          return res.status(429).json({ error: 'Too many requests. Please try again later.' });
        }

        try {
            const { question, response, sessionId, timestamp, userAgent, referrer } = req.body;

            if (!question || !response) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const { data, error } = await supabase
                .from('jarvis_analytics')
                .insert([
                    {
                        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        question,
                        response,
                        session_id: sessionId,
                        timestamp: timestamp || new Date().toISOString(),
                        user_agent: userAgent,
                        referrer: referrer || 'direct',
                        ip_address: clientIp
                    }
                ]);

            if (error) {
                console.error('Supabase error:', error);
                return res.status(500).json({ error: error.message });
            }

            return res.status(200).json({ success: true, data });
        } catch (error) {
            console.error('Analytics API error:', error);
            return res.status(500).json({ error: error.message });
        }
    }


  if (req.method === 'GET') {
    try {
      const authHeader = req.headers.authorization;
      const expectedToken = process.env.ANALYTICS_SECRET_TOKEN;

      if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'You need to provide the secret token to view analytics'
        });
      }

      const { data, error } = await supabase
        .from('jarvis_analytics')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1000);

      if (error) {
        console.error('Supabase fetch error:', error);
        return res.status(500).json({ error: error.message });
      }

      const insights = processAnalyticsData(data);

      return res.status(200).json({
        success: true,
        total: data.length,
        data,
        insights
      });
    } catch (error) {
      console.error('Analytics fetch error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

function processAnalyticsData(data) {
  if (!data || data.length === 0) {
    return {
      totalSessions: 0,
      totalQuestions: 0,
      topicBreakdown: {},
      mostAskedTopics: [],
      entityMentions: {},
      hourlyBreakdown: {}
    };
  }

  const topicBreakdown = {};
  const entityMentions = {};
  const hourlyBreakdown = {};

  data.forEach(interaction => {
    const topics = extractTopics(interaction.question);
    const entities = extractEntities(interaction.question);
    const hour = new Date(interaction.timestamp).getHours();

    topics.forEach(topic => {
      topicBreakdown[topic] = (topicBreakdown[topic] || 0) + 1;
    });

    entities.forEach(entity => {
      entityMentions[entity] = (entityMentions[entity] || 0) + 1;
    });

    const hourKey = `${hour}:00`;
    hourlyBreakdown[hourKey] = (hourlyBreakdown[hourKey] || 0) + 1;
  });

  const mostAskedTopics = Object.entries(topicBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic, count]) => ({ topic, count }));

  const topEntities = Object.entries(entityMentions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const uniqueSessions = new Set(data.map(d => d.session_id)).size;

  return {
    totalSessions: uniqueSessions,
    totalQuestions: data.length,
    topicBreakdown,
    mostAskedTopics,
    entityMentions: topEntities,
    hourlyBreakdown
  };
}

function extractTopics(question) {
  const lower = question.toLowerCase();
  const topics = [];

  if (lower.includes('project') || lower.includes('vimaan') || lower.includes('tumor') || lower.includes('brain')) {
    topics.push('projects');
  }
  if (lower.includes('skill') || lower.includes('tech') || lower.includes('language') || lower.includes('proficient')) {
    topics.push('skills');
  }
  if (lower.includes('experience') || lower.includes('work') || lower.includes('deloitte') || lower.includes('drdo') || lower.includes('prana')) {
    topics.push('experience');
  }
  if (lower.includes('education') || lower.includes('usc') || lower.includes('rvce') || lower.includes('university') || lower.includes('degree')) {
    topics.push('education');
  }
  if (lower.includes('contact') || lower.includes('email') || lower.includes('reach') || lower.includes('linkedin') || lower.includes('github')) {
    topics.push('contact');
  }
  if (lower.includes('ai') || lower.includes('machine learning') || lower.includes('ml') || lower.includes('deep learning')) {
    topics.push('ai_ml');
  }
  if (lower.includes('aerospace') || lower.includes('cfd') || lower.includes('aerodynamic') || lower.includes('flight')) {
    topics.push('aerospace');
  }

  return topics;
}

function extractEntities(question) {
  const lower = question.toLowerCase();
  const entities = [];

  const projects = ['vimaan', 'brain tumor', 'segmentation', 'recipe vault', 'expense tracker', 'cfd', 'aerodynamic'];
  projects.forEach(project => {
    if (lower.includes(project)) entities.push(project);
  });

  const skills = ['python', 'pytorch', 'tensorflow', 'react', 'nodejs', 'matlab', 'sql', 'java', 'cpp', 'javascript'];
  skills.forEach(skill => {
    if (lower.includes(skill)) entities.push(skill);
  });

  const companies = ['deloitte', 'drdo', 'prana', 'usc', 'rvce', 'liba space'];
  companies.forEach(company => {
    if (lower.includes(company)) entities.push(company);
  });

  return [...new Set(entities)];
}
