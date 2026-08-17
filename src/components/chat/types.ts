// Shared types for the chat UI.

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  /**
   * Page sections backing this answer, derived server-side. Absent on user
   * turns, on greetings, and whenever nothing matched — the UI renders nothing
   * rather than guessing, because a chip that scrolls somewhere irrelevant is
   * worse than no chip.
   */
  sources?: SourceLink[];
}

/** A section of the page an answer drew on. */
export interface SourceLink {
  id: string;
  label: string;
}

export interface ChatStats {
  messageCount: number;
  userQuestions: number;
  topics: string[];
}
