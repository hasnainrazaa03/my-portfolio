// Shared types for the chat UI.

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatStats {
  messageCount: number;
  userQuestions: number;
  topics: string[];
}
