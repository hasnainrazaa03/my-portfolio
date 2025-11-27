import { PERSONAL_INFO, PROJECTS, SKILLS, EXPERIENCE, EDUCATION } from '../constants';

// --- SYSTEM PROMPT ---
const SYSTEM_PROMPT = `
You are an AI assistant for Hasnain Raza's portfolio website.
Your goal is to answer questions about Hasnain's background, skills, and projects professionally and concisely.

Here is the context about Hasnain:
- **Bio:** ${PERSONAL_INFO.bioHeadline} ${PERSONAL_INFO.bioStory}
- **Education:** MSCS at USC (Scientists & Engineers Program), B.Tech Aerospace at RVCE.
- **Key Projects:** ${PROJECTS.map(p => p.title).join(', ')}.
- **Experience:** Worked at ${EXPERIENCE.map(e => e.company).join(', ')}.
- **Skills:** Expert in Python, PyTorch, MATLAB, CFD Analysis. Proficient in React, Node.js.

**Rules:**
1. Keep answers short (under 3 sentences) unless asked for detail.
2. Be helpful, enthusiastic, and professional.
3. If asked about something not in the context, say you don't know but suggest contacting him.
4. Do not hallucinate facts. Stick to the provided context.
`;

// --- FETCH FUNCTION ---
export const fetchHFResponse = async (messages) => {
  try {
    const lastUserMessage = messages[messages.length - 1].content;
    
    // We call OUR OWN internal API route now, not Hugging Face directly
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: `<s>[INST] ${SYSTEM_PROMPT} \n\n User Question: ${lastUserMessage} [/INST]`,
      }),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const result = await response.json();
    // Mistral API via our proxy returns an array
    return result[0]?.generated_text || null;

  } catch (error) {
    console.error("AI Service Failed (Falling back to local):", error);
    return null; // Return null to trigger local fallback
  }
};

// --- LOCAL FALLBACK LOGIC ---
export const getLocalResponse = (input) => {
  const lowerInput = input.toLowerCase();

  if (lowerInput.match(/hello|hi|hey/)) {
    return "Hello! I'm Hasnain's AI assistant. Ask me about his projects, skills, or background!";
  }
  if (lowerInput.includes('project') || lowerInput.includes('work')) {
    return `Hasnain has built impressive projects like **${PROJECTS[0].title}** (${PROJECTS[0].category}) and **${PROJECTS[1].title}**. Check out the Projects section for more!`;
  }
  if (lowerInput.includes('skill') || lowerInput.includes('stack')) {
    return "He is an expert in Python, PyTorch, and MATLAB, with strong skills in React and Node.js.";
  }
  if (lowerInput.includes('contact') || lowerInput.includes('email')) {
    return `You can reach him at **${PERSONAL_INFO.email}** or via the contact form below.`;
  }
  return "I'm not sure about that specific detail, but I can tell you about Hasnain's Aerospace background, AI projects, or work experience at Deloitte.";
};

// --- MAIN EXPORT ---
export const getChatResponse = async (messages) => {
  // 1. Try Real AI first (via Vercel Proxy)
  const aiResponse = await fetchHFResponse(messages);
  if (aiResponse) return aiResponse;

  // 2. Fallback to Local Logic if AI fails
  const lastMessage = messages[messages.length - 1].content;
  return getLocalResponse(lastMessage);
};