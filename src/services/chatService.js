import { PERSONAL_INFO, PROJECTS, SKILLS, EXPERIENCE, EDUCATION } from '../constants';

const SYSTEM_CONTEXT = `
You are Jarvis, an AI assistant for Hasnain Raza's portfolio.
Answer questions about Hasnain's background, skills, and projects professionally.

Context:
- Bio: ${PERSONAL_INFO.bioHeadline}
- Education: MSCS at USC, B.Tech Aerospace.
- Projects: ${PROJECTS.map(p => p.title).join(', ')}.
- Experience: ${EXPERIENCE.map(e => e.company).join(', ')}.
- Skills: Python, PyTorch, MATLAB, CFD Analysis, React.

Rules:
1. Keep answers short (under 3 sentences).
2. Be helpful and enthusiastic.
`;

export const getChatResponse = async (messages) => {
  const lastUserMessage = messages[messages.length - 1].content;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Qwen / ChatML Prompt Format
      body: JSON.stringify({
        inputs: `<|im_start|>system\n${SYSTEM_CONTEXT}<|im_end|>\n<|im_start|>user\n${lastUserMessage}<|im_end|>\n<|im_start|>assistant\n`
      }),
    });

    if (!response.ok) {
        throw new Error('Network response was not ok');
    }

    const result = await response.json();
    // The router API returns an array with 'generated_text'
    return result[0]?.generated_text || "I am offline right now.";

  } catch (error) {
    console.error("AI Error (Using Local Fallback):", error);
    return getLocalResponse(lastUserMessage);
  }
};

export const getLocalResponse = (input) => {
  const lower = input.toLowerCase();
  if (lower.match(/hello|hi/)) return "Greetings. I am Jarvis. Ask me about Hasnain's projects.";
  if (lower.includes('project')) return `Hasnain has built ${PROJECTS.length} major projects, including ${PROJECTS[0].title}.`;
  if (lower.includes('contact')) return `You can reach him at ${PERSONAL_INFO.email}.`;
  return "I can provide intel on Hasnain's Aerospace background, AI projects, or work experience.";
};