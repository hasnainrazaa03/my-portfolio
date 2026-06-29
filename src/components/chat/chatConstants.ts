// Shared constants for the chat UI (extracted from the Chatbot monolith).
import type { ChatMessage } from './types';

// TODO: Add /me.jpg to public/ — a square headshot of Hasnain for chat avatar & hero.
export const AVATAR_SRC = '/me.jpg';

export const INITIAL_MESSAGE: ChatMessage = {
  role: 'assistant',
  content:
    "Hey there! I'm Hasnain — feel free to ask about my 💻 projects, 🛠️ skills, 💼 experience, or 🎓 education. What would you like to know?",
};

export const CHIP_PREFIXES = ['🚀 ', '⚡ ', '💼 ', '📧 ', '📚 '];

export const SUGGESTIONS = [
  '🚀 Tell me about your projects',
  "⚡ What's your tech stack?",
  '💼 Experience at Deloitte?',
  '📧 How can I contact you?',
  '📚 Summarize your background',
];

// Allow-list of personas the UI can select. Must match the keys in
// PERSONA_OVERLAYS on the server (api/chat.js). The server re-validates.
export const PERSONAS = [
  { key: 'default', label: 'Default' },
  { key: 'recruiter', label: 'Recruiter' },
  { key: 'aerospace', label: 'Aerospace' },
  { key: 'startup', label: 'Startup' },
];
