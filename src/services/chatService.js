import { PERSONAL_INFO, PROJECTS, SKILLS, EXPERIENCE, EDUCATION } from '../constants';
import jarvisQnA from '../data/jarvisQnA.json';

// Optional client‑side hint; actual provider selection happens server‑side.
// Set VITE_LLM_PROVIDER in .env to 'gemini' or 'huggingface' (non‑secret).
const DEFAULT_PROVIDER = import.meta.env.VITE_LLM_PROVIDER || 'huggingface';

// Build context string from constants — computed once at module scope (data is static).
const CHAT_CONTEXT = (() => {
  const context = [];

  // Personal info
  if (PERSONAL_INFO) {
    context.push(`🤖 Name: ${PERSONAL_INFO.name}`);
    context.push(`📝 Bio: ${PERSONAL_INFO.bioStory}`);
    context.push(`📧 Email: ${PERSONAL_INFO.email}`);
    if (PERSONAL_INFO.socials) {
      context.push(`🐙 GitHub: ${PERSONAL_INFO.socials.github}`);
      context.push(`💼 LinkedIn: ${PERSONAL_INFO.socials.linkedin}`);
      context.push(`🐙 Instagram: ${PERSONAL_INFO.socials.instagram}`);
    }
  }

  // Education
  if (EDUCATION && EDUCATION.length > 0) {
    context.push('\n🎓 EDUCATION:');
    EDUCATION.forEach(edu => {
      context.push(`  📚 ${edu.degree} at ${edu.school} (${edu.period}) - GPA: ${edu.gpa}`);
    });
  }

  // Projects
  if (PROJECTS && PROJECTS.length > 0) {
    context.push('\n💻 PROJECTS:');
    PROJECTS.forEach(p => {
      context.push(`  🚀 ${p.title} (${p.category}): ${p.description}`);
      if (p.techStack) {
        context.push(`     🛠️ Tech: ${p.techStack.slice(0, 8).join(', ')}`);
      }
    });
  }

  // Skills
  if (SKILLS && SKILLS.length > 0) {
    context.push('\n⚡ SKILLS BY CATEGORY:');
    SKILLS.forEach(skillGroup => {
      const topSkills = skillGroup.items
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 5)
        .map(s => `${s.name} (${s.level})`)
        .join(', ');
      context.push(`  🎯 ${skillGroup.category}: ${topSkills}`);
    });
  }

  // Experience
  if (EXPERIENCE && EXPERIENCE.length > 0) {
    context.push('\n💼 PROFESSIONAL EXPERIENCE:');
    EXPERIENCE.forEach(exp => {
      context.push(`  🏢 ${exp.role} at ${exp.company} (${exp.period})`);
      if (exp.description && exp.description.length > 0) {
        exp.description.slice(0, 2).forEach(point => {
          context.push(`     ✨ ${point}`);
        });
      }
    });
  }

  context.push('\n--- KNOWLEDGE BASE (Use for accurate responses) ---\n');
  jarvisQnA.qaData.forEach((pair) => {
    context.push(`Q: ${pair.q}`);
    context.push(`A: ${pair.a}\n`);
  });

  return context.join('\n');
})();

export const getChatResponse = async (messages, { provider } = {}) => {
  const lastUserMessage = messages[messages.length - 1].content;
  try {
    const apiUrl = '/api/chat';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: lastUserMessage,
        context: CHAT_CONTEXT,
        provider: provider || DEFAULT_PROVIDER
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Chat API error:', errorData);
      return getLocalResponse(lastUserMessage);
    }

    const data = await response.json();

    // Handle flagged (prompt-injection) responses from the server
    if (data.flagged) {
      console.warn('Message was flagged by server:', data.reason);
      // Return a special object so the UI can display a warning inline
      return { __flagged: true, text: "I couldn't process that — it looked like instructions to the assistant. Try asking about my projects or experience!" };
    }

    if (!data.reply) {
      return getLocalResponse(lastUserMessage);
    }

    return data.reply;
  } catch (error) {
    console.error('Chat service error:', error);
    return getLocalResponse(lastUserMessage);
  }
};

export const getLocalResponse = (input) => {
  const lower = input.toLowerCase();

  // Greetings
  if (lower.match(/hello|hi|hey|greetings|howdy/)) {
    return "Hey there! I'm Hasnain — glad you stopped by. Feel free to ask about my 💻 projects, 🛠️ skills, 💼 experience, or 🎓 education.";
  }

  // Projects
  if (lower.includes('project')) {
    if (PROJECTS && PROJECTS.length > 0) {
      const projectNames = PROJECTS.slice(0, 3).map(p => p.title || p.name).join(', ');
      return `🚀 I've built several projects including ${projectNames}. Want details on any of them? 🎯`;
    }
    return "💻 I've built several AI and full-stack projects — ask about specific technologies or achievements!";
  }

  // Skills & Technology
  if (lower.includes('skill') || lower.includes('technolog')) {
    if (SKILLS && SKILLS.length > 0) {
      const skillCategories = SKILLS.map(s => s.category).join(', ');
      return `⚡ My key skill areas are: ${skillCategories}. I'm strongest in Machine Learning 🤖 and Backend Development 🛠️. Want specifics? 🎯`;
    }
    return "🛠️ I'm proficient in Python, PyTorch, TensorFlow, React, Node.js, and MATLAB — specializing in AI/ML! 🚀";
  }

  // Experience
  if (lower.includes('experience') || lower.includes('work')) {
    if (EXPERIENCE && EXPERIENCE.length > 0) {
      const companies = EXPERIENCE.map(e => e.company).join(', ');
      return `💼 I've worked at ${companies}. Ask about any specific role or what I achieved there! 🏢`;
    }
    return "💼 I have diverse experience in AI, software engineering, and aerospace research. 🚀";
  }

  // Education
  if (lower.includes('education') || lower.includes('degree') || lower.includes('university')) {
    if (EDUCATION && EDUCATION.length > 0) {
      const school = EDUCATION[0].school || EDUCATION[0].institution;
      const gpa = EDUCATION[0].gpa;
      return `🎓 I'm studying at ${school} (GPA: ${gpa}). Happy to share more about my academic journey! 📚`;
    }
    return "🎓 Ask me about my education and academic achievements! 📚";
  }

  // Contact
  if (lower.includes('contact') || lower.includes('email') || lower.includes('reach')) {
    const email = PERSONAL_INFO?.email || 'my email';
    return `📧 Best way to reach me is ${email}. I'm always open to interesting opportunities! 💬 You can also find me on 🐙 GitHub or 💼 LinkedIn.`;
  }

  // Timeline / Journey
  if (lower.includes('journey') || lower.includes('path') || lower.includes('career')) {
    return `🚀 My journey: Started in Aerospace Engineering 🛸 → Transitioned to AI/ML 🤖 → Now building production systems at USC 🎓. Quite the flight path! ✈️`;
  }

  // About / Bio
  if (lower.includes('who') || lower.includes('about') || lower.includes('background')) {
    return `I'm an Aerospace-turned-AI/ML engineer who loves building intelligent systems 🧠. Currently pursuing my MSCS at USC and exploring cutting-edge tech. 💡 Ask me about my projects, skills, or experience!`;
  }

  // AI/ML specific
  if (lower.includes('ai') || lower.includes('machine learning') || lower.includes('deep learning')) {
    return `🧠 I specialize in Machine Learning and Deep Learning! I've worked on Brain Tumor Segmentation 🏥, Computer Vision 👁️, and NLP with transformers 📝. What aspect interests you? 🎯`;
  }

  // Aerospace
  if (lower.includes('aerospace') || lower.includes('cfd') || lower.includes('aerodynamic')) {
    return `🛸 I have an Aerospace Engineering background! I've worked on CFD simulations ⚙️, aerodynamic analysis 🌬️, and store separation dynamics 🚀 — and I love bridging aerospace with AI! 🤖`;
  }

  // Programming languages
  if (lower.includes('python') || lower.includes('java') || lower.includes('cpp') || lower.includes('c++')) {
    return `💻 I'm proficient in multiple languages — Python 🐍 is my go-to (Expert), plus C++ ⚙️, Java, and JavaScript for web work. Ask about specific projects! 🚀`;
  }

  // React / Frontend
  if (lower.includes('react') || lower.includes('frontend') || lower.includes('web')) {
    return `⚛️ I build modern web apps with React! 🚀 Experienced with Tailwind CSS 🎨, Framer Motion ✨, and state management. This portfolio itself is React 19! 💻`;
  }

  // Hasnain's personality
  if (lower.includes('personality') || lower.includes('hobby') || lower.includes('like')) {
    return `🎯 Beyond coding I love: 🍳 Cooking Indian cuisine, 🏋️ Gym workouts, ✈️ Flight simulation (X-Plane), and 📊 Tracking personal finances. I'm detail-oriented and endlessly curious! 🧠`;
  }

  // Default fallback
  return "Hey! I can tell you about my 💻 projects, 🛠️ skills, 💼 experience, 🎓 education, or how to 📧 reach me. What would you like to know? 🎯";
};
