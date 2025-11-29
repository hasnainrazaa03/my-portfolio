/**
 * Analytics Service for Jarvis Chatbot
 * Tracks all interactions and provides insights
 * 📁 Location: src/services/analyticsService.js
 */

class AnalyticsService {
  constructor() {
    this.interactions = [];
    this.sessionStart = new Date();
    this.sessionId = this.generateSessionId();
  }

  /**
   * Generate unique session ID
   * Each chat session gets a unique ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log a chat interaction
   * Called every time user asks a question
   */
  logInteraction(question, response, metadata = {}) {
    const interaction = {
      id: `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: this.sessionId,
      question: question.trim(),
      response: response.trim(),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      referrer: document.referrer || 'direct',
      timestamp_unix: Date.now(),
      ...metadata
    };

    this.interactions.push(interaction);
    
    // 💾 Save to browser's LocalStorage
    this.persistToLocalStorage();
    
    console.log('📊 Analytics logged:', interaction);
    
    return interaction;
  }

  /**
   * Persist interactions to localStorage
   * This makes data survive page refreshes
   */
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

  /**
   * Extract topics from a question
   * Example: "Tell me about projects" → extracts "projects"
   */
  extractTopics(question) {
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

  /**
   * Extract key entities mentioned
   * Example: "Tell me about Vimaan" → extracts "vimaan"
   */
  extractEntities(question) {
    const lower = question.toLowerCase();
    const entities = [];

    // Projects
    const projects = ['vimaan', 'brain tumor', 'segmentation', 'recipe vault', 'expense tracker', 'cfd', 'aerodynamic'];
    projects.forEach(project => {
      if (lower.includes(project)) entities.push(project);
    });

    // Skills
    const skills = ['python', 'pytorch', 'tensorflow', 'react', 'nodejs', 'matlab', 'sql', 'java', 'cpp', 'javascript'];
    skills.forEach(skill => {
      if (lower.includes(skill)) entities.push(skill);
    });

    // Companies
    const companies = ['deloitte', 'drdo', 'prana', 'usc', 'rvce', 'liba space'];
    companies.forEach(company => {
      if (lower.includes(company)) entities.push(company);
    });

    return [...new Set(entities)]; // Remove duplicates
  }

  /**
   * Get analytics summary
   * Returns all stats about this session
   */
  getAnalyticsSummary() {
    if (this.interactions.length === 0) {
      return {
        totalInteractions: 0,
        totalQuestions: 0,
        topicBreakdown: {},
        mostAskedTopics: [],
        entityMentions: {},
        averageResponseTime: 0,
        sessionDuration: 0
      };
    }

    // Count interactions
    const totalInteractions = this.interactions.length;
    const totalQuestions = this.interactions.length;

    // Topic breakdown
    const topicBreakdown = {};
    const allTopics = [];
    const entityMentions = {};

    this.interactions.forEach(interaction => {
      const topics = this.extractTopics(interaction.question);
      const entities = this.extractEntities(interaction.question);

      topics.forEach(topic => {
        topicBreakdown[topic] = (topicBreakdown[topic] || 0) + 1;
        allTopics.push(topic);
      });

      entities.forEach(entity => {
        entityMentions[entity] = (entityMentions[entity] || 0) + 1;
      });
    });

    // Most asked topics (top 5)
    const mostAskedTopics = Object.entries(topicBreakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic, count]) => ({ topic, count }));

    // Most mentioned entities (top 10)
    const topEntities = Object.entries(entityMentions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .reduce((acc, [entity, count]) => {
        acc[entity] = count;
        return acc;
      }, {});

    // Session duration
    const sessionDuration = Date.now() - this.sessionStart.getTime();

    return {
      totalInteractions,
      totalQuestions,
      topicBreakdown,
      mostAskedTopics,
      entityMentions: topEntities,
      sessionDuration,
      sessionStart: this.sessionStart.toISOString(),
      sessionId: this.sessionId
    };
  }

  /**
   * Get interactions by topic
   */
  getInteractionsByTopic(topic) {
    return this.interactions.filter(interaction => {
      const topics = this.extractTopics(interaction.question);
      return topics.includes(topic);
    });
  }

  /**
   * Get hourly breakdown
   */
  getHourlyBreakdown() {
    const breakdown = {};

    this.interactions.forEach(interaction => {
      const date = new Date(interaction.timestamp);
      const hour = date.getHours();
      const key = `${hour}:00`;
      breakdown[key] = (breakdown[key] || 0) + 1;
    });

    return breakdown;
  }

  /**
   * Export analytics as JSON
   * For downloading and analysis
   */
  exportAsJSON() {
    return {
      sessionId: this.sessionId,
      sessionStart: this.sessionStart.toISOString(),
      exportTime: new Date().toISOString(),
      summary: this.getAnalyticsSummary(),
      interactions: this.interactions
    };
  }

  /**
   * Clear analytics
   * Removes all stored data
   */
  clearAnalytics() {
    this.interactions = [];
    try {
      localStorage.removeItem(`jarvis_analytics_${this.sessionId}`);
    } catch (e) {
      console.warn('Failed to clear localStorage:', e);
    }
  }
}

// Create singleton instance
// This means there's only ONE instance of AnalyticsService
// used throughout the entire app
export const analyticsService = new AnalyticsService();
