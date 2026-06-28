/**
 * Client-side analytics.
 *
 * PRIVACY POSTURE
 *  - We no longer send `userAgent` or `referrer` to the backend. The
 *    backend redacts these fields server-side too, and the user IP is
 *    hashed (see api/_lib/hashIp.js).
 *  - IDs use `crypto.randomUUID()` instead of `Math.random().toString(36).substr(...)`.
 */

import { env } from '../config/env.js';

function safeUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for very old browsers; not cryptographically strong but acceptable for analytics IDs.
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

class AnalyticsService {
  constructor() {
    this.interactions = [];
    this.sessionStart = new Date();
    this.sessionId = this.generateSessionId();
    this.backendUrl = '/api/analytics';
  }


  generateSessionId() {
    return `session_${safeUUID()}`;
  }

  async logInteraction(question, response, metadata = {}) {
    const interaction = {
      id: safeUUID(),
      sessionId: this.sessionId,
      question: question.trim(),
      response: response.trim(),
      timestamp: new Date().toISOString(),
      timestamp_unix: Date.now(),
      topics: this.extractTopics(question),
      entities: this.extractEntities(question),
      ...metadata
    };


    this.interactions.push(interaction);


    try {
      // Public write-gate token (not a secret admin key). Set
      // VITE_ANALYTICS_WRITE_TOKEN in .env.local. Centralized in config/env.js.
      const writeToken = env.analyticsWriteToken;

      const fetchResponse = await fetch(this.backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-analytics-token': writeToken,
        },
        body: JSON.stringify(interaction)
      });


      if (!fetchResponse.ok) {
        console.warn('Failed to send analytics to backend');
        this.persistToLocalStorage();
      }
    } catch (error) {
      console.warn('Analytics backend error, storing locally:', error);
      this.persistToLocalStorage();
    }


    return interaction;
  }


  persistToLocalStorage() {
    try {
      localStorage.setItem(
        `jarvis_analytics_${this.sessionId}`,
        JSON.stringify(this.interactions)
      );
    } catch (e) {
      console.warn('Failed to persist analytics to localStorage:', e);
    }
  }


  extractTopics(question) {
    const lower = question.toLowerCase();
    const topics = [];


    if (lower.includes('project') || lower.includes('vimaan')) topics.push('projects');
    if (lower.includes('skill') || lower.includes('tech')) topics.push('skills');
    if (lower.includes('experience') || lower.includes('work')) topics.push('experience');
    if (lower.includes('education') || lower.includes('usc')) topics.push('education');
    if (lower.includes('contact') || lower.includes('email')) topics.push('contact');
    if (lower.includes('ai') || lower.includes('machine learning')) topics.push('ai_ml');
    if (lower.includes('aerospace') || lower.includes('cfd')) topics.push('aerospace');


    return topics;
  }


  extractEntities(question) {
    const lower = question.toLowerCase();
    const entities = [];


    const projects = ['vimaan', 'brain tumor', 'segmentation', 'recipe vault', 'expense tracker'];
    const skills = ['python', 'pytorch', 'tensorflow', 'react', 'nodejs', 'matlab'];
    const companies = ['deloitte', 'drdo', 'prana', 'usc', 'rvce'];


    [...projects, ...skills, ...companies].forEach(item => {
      if (lower.includes(item)) entities.push(item);
    });


    return [...new Set(entities)];
  }

  getLocalAnalytics() {
    return this.getAnalyticsSummary();
  }


  getAnalyticsSummary() {
    if (this.interactions.length === 0) {
      return {
        totalInteractions: 0,
        totalQuestions: 0,
        topicBreakdown: {},
        mostAskedTopics: [],
        entityMentions: {},
        sessionDuration: 0
      };
    }


    const topicBreakdown = {};
    const entityMentions = {};


    this.interactions.forEach(interaction => {
      interaction.topics?.forEach(topic => {
        topicBreakdown[topic] = (topicBreakdown[topic] || 0) + 1;
      });
      interaction.entities?.forEach(entity => {
        entityMentions[entity] = (entityMentions[entity] || 0) + 1;
      });
    });


    const mostAskedTopics = Object.entries(topicBreakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic, count]) => ({ topic, count }));


    const sessionDuration = Date.now() - this.sessionStart.getTime();


    return {
      totalInteractions: this.interactions.length,
      totalQuestions: this.interactions.length,
      topicBreakdown,
      mostAskedTopics,
      entityMentions,
      sessionDuration,
      sessionStart: this.sessionStart.toISOString(),
      sessionId: this.sessionId
    };
  }

  async fetchAnalyticsFromBackend(token) {
    try {
      const response = await fetch(this.backendUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });


      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized: Invalid or missing token');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }


      return await response.json();
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      return null;
    }
  }


  clearAnalytics() {
    this.interactions = [];
    localStorage.removeItem(`jarvis_analytics_${this.sessionId}`);
  }

  exportAsJSON() {
    return {
      sessionId: this.sessionId,
      sessionStart: this.sessionStart.toISOString(),
      exportTime: new Date().toISOString(),
      summary: this.getAnalyticsSummary(),
      interactions: this.interactions
    };
  }
}


export const analyticsService = new AnalyticsService();
