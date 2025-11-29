import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

    if (req.method === 'POST') {
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
                        ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress
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
