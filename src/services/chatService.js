import { PERSONAL_INFO, PROJECTS, SKILLS, EXPERIENCE, EDUCATION } from '../constants';

export const getChatResponse = async (messages) => {
  const lastUserMessage = messages[messages.length - 1].content;
  console.log("📨 Sending to /api/chat:", lastUserMessage);

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: lastUserMessage })
    });

    console.log("✅ Response status:", response.status);

    if (!response.ok) {
      console.warn("API failed");
      return getLocalResponse(lastUserMessage);
    }

    const data = await response.json();
    console.log("📩 Got reply:", data.reply);
    return data.reply || getLocalResponse(lastUserMessage);

  } catch (error) {
    console.error("❌ Error:", error);
    return getLocalResponse(lastUserMessage);
  }
};

export const getLocalResponse = (input) => {
  const lower = input.toLowerCase();
  if (lower.match(/hello|hi|hey|greetings/)) return "Greetings. I am Jarvis.";
  if (lower.includes('project')) return "Hasnain has built several AI and full-stack projects.";
  if (lower.includes('skill')) return "Python, PyTorch, TensorFlow, React, Node.js, MATLAB.";
  if (lower.includes('experience')) return `Experience at ${EXPERIENCE.map(e => e.company).join(', ')}.`;
  if (lower.includes('contact') || lower.includes('email')) return `Reach out at ${PERSONAL_INFO.email}!`;
  return "Ask about projects, skills, or experience!";
};
