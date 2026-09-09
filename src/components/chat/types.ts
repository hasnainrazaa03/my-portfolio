// Shared types for the chat UI.

export interface ChatMessage {
  /**
   * Stable identity for messages created during a live exchange. Streaming
   * updates and the final replace target THIS, never "the last message":
   * anything else that touches the transcript mid-stream (a second send, a
   * clear, a local answer) would otherwise have its bubble overwritten by a
   * reply that belongs to an earlier turn. Optional because the greeting and
   * demo messages are static.
   */
  id?: string;
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
