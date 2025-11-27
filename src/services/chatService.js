import { PERSONAL_INFO, PROJECTS, SKILLS, EXPERIENCE, EDUCATION } from '../constants';

export const getChatResponse = async (messages) => {
  const lastUserMessage = messages[messages.length - 1].content;

  try {
    // ✅ CALL YOUR VERCEL API (no CORS issues!)
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: lastUserMessage })
    });

    if (!response.ok) {
      console.warn("API failed, using local fallback");
      return getLocalResponse(lastUserMessage);
    }

    const data = await response.json();
    return data.reply || getLocalResponse(lastUserMessage);

  } catch (error) {
    console.error("Error:", error);
    return getLocalResponse(lastUserMessage);
  }
};

export const getLocalResponse = (input) => {
  const lower = input.toLowerCase();
  
  if (lower.match(/hello|hi|hey|greetings/)) {
    return "Greetings. I am Jarvis. Ask me about Hasnain's projects, skills, or experience.";
  }
  
  if (lower.includes('project')) {
    const projectList = PROJECTS.map(p => p.title).join(', ');
    return `Hasnain has built: ${projectList}.`;
  }
  
  if (lower.includes('skill') || lower.includes('tech')) {
    return "Python, PyTorch, TensorFlow, React, Node.js, MATLAB, and SQL.";
  }
  
  if (lower.includes('experience')) {
    return `Experience at ${EXPERIENCE.map(e => e.company).join(', ')}.`;
  }
  
  if (lower.includes('contact') || lower.includes('email')) {
    return `Reach out at ${PERSONAL_INFO.email}!`;
  }
  
  if (lower.includes('education')) {
    return "MSCS at USC. B.Tech in Aerospace Engineering from RVCE.";
  }
  
  if (lower.includes('vimaan')) {
    return "Project Vimaan: Voice-controlled AI co-pilot for X-Plane flight simulation.";
  }
  
  if (lower.includes('3d') || lower.includes('vision')) {
    return "SO(3)-equivariant neural networks for 3D object recognition.";
  }
  
  if (lower.includes('recipe')) {
    return "Full-stack MERN recipe app with Google OAuth and meal planning.";
  }
  
  return "Ask about projects, skills, experience, or education!";
};
