import { PERSONAL_INFO, PROJECTS, SKILLS, EXPERIENCE, EDUCATION } from '../constants';

export const getChatResponse = async (messages) => {
  const lastUserMessage = messages[messages.length - 1].content;
  console.log("📨 Sending message:", lastUserMessage);

  try {
    // Determine the correct API URL based on environment
    const apiUrl = process.env.NODE_ENV === 'production' 
      ? '/api/chat'  // Vercel automatically routes this
      : 'http://localhost:3000/api/chat'; // Local dev
    
    console.log("🔗 API URL:", apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: lastUserMessage })
    });

    console.log("✅ Response status:", response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ API Error:", errorData);
      console.warn("⚠️ Falling back to local response");
      return getLocalResponse(lastUserMessage);
    }

    const data = await response.json();
    console.log("📩 Got reply:", data.reply?.substring(0, 50) + "...");
    
    if (!data.reply) {
      console.warn("⚠️ Empty reply, using fallback");
      return getLocalResponse(lastUserMessage);
    }

    return data.reply;

  } catch (error) {
    console.error("❌ Network error:", error.message);
    return getLocalResponse(lastUserMessage);
  }
};

export const getLocalResponse = (input) => {
  const lower = input.toLowerCase();
  
  // Greetings
  if (lower.match(/hello|hi|hey|greetings|howdy/)) {
    return "Greetings. I am Jarvis, Hasnain's AI assistant. Ask me about his projects, skills, or experience.";
  }
  
  // Projects
  if (lower.includes('project')) {
    if (PROJECTS && PROJECTS.length > 0) {
      const projectNames = PROJECTS.slice(0, 3).map(p => p.title || p.name).join(', ');
      return `Hasnain has built several impressive projects including: ${projectNames}. Would you like details on any specific project?`;
    }
    return "Hasnain has built several AI and full-stack projects. Ask about specific technologies!";
  }
  
  // Skills
  if (lower.includes('skill') || lower.includes('technolog')) {
    if (SKILLS && SKILLS.length > 0) {
      const skillList = SKILLS.slice(0, 6).join(', ');
      return `Hasnain's key skills include: ${skillList}.`;
    }
    return "Hasnain is proficient in Python, PyTorch, TensorFlow, React, Node.js, and MATLAB.";
  }
  
  // Experience
  if (lower.includes('experience') || lower.includes('work')) {
    if (EXPERIENCE && EXPERIENCE.length > 0) {
      const companies = EXPERIENCE.map(e => e.company).join(', ');
      return `Hasnain has valuable experience at: ${companies}. Ask about specific roles!`;
    }
    return "Hasnain has diverse experience in AI, software engineering, and research.";
  }
  
  // Education
  if (lower.includes('education') || lower.includes('degree') || lower.includes('university')) {
    if (EDUCATION && EDUCATION.length > 0) {
      const school = EDUCATION[0].school || EDUCATION[0].institution;
      return `Hasnain studied at ${school}. Ask for more details about his academic background!`;
    }
    return "Ask about Hasnain's educational background and qualifications.";
  }
  
  // Contact
  if (lower.includes('contact') || lower.includes('email') || lower.includes('reach')) {
    const email = PERSONAL_INFO?.email || 'his email';
    return `You can reach Hasnain at ${email}. He's always open to interesting opportunities!`;
  }
  
  // About
  if (lower.includes('who') || lower.includes('about')) {
    return "Hasnain is a skilled developer and AI enthusiast. Ask me about his projects, skills, or experience!";
  }
  
  // Default
  return "I can help you learn about Hasnain's projects, skills, experience, and contact information. What would you like to know?";
};