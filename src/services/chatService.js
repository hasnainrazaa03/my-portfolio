import { PERSONAL_INFO, PROJECTS, SKILLS, EXPERIENCE, EDUCATION } from '../constants';
import jarvisQnA from '../data/jarvisQnA.json';

// Build context string from constants
const buildContext = () => {
  let context = [];

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
};

export const getChatResponse = async (messages) => {
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
        context: buildContext()
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Chat API error:', errorData);
      return getLocalResponse(lastUserMessage);
    }

    const data = await response.json();
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
    return "🤖 Greetings! I am Jarvis, Hasnain's AI assistant. Ask me about his 💻 projects, 🛠️ skills, 💼 experience, or 🎓 education.";
  }

  // Projects
  if (lower.includes('project')) {
    if (PROJECTS && PROJECTS.length > 0) {
      const projectNames = PROJECTS.slice(0, 3).map(p => p.title || p.name).join(', ');
      return `🚀 Hasnain has built several impressive projects including: ${projectNames}. Would you like details on any specific project? 🎯`;
    }
    return "💻 Hasnain has built several AI and full-stack projects. Ask about specific technologies or achievements!";
  }

  // Skills & Technology
  if (lower.includes('skill') || lower.includes('technolog')) {
    if (SKILLS && SKILLS.length > 0) {
      const skillCategories = SKILLS.map(s => s.category).join(', ');
      return `⚡ Hasnain's key skill categories include: ${skillCategories}. His strongest areas are Machine Learning 🤖 and Backend Development 🛠️. Want specifics? 🎯`;
    }
    return "🛠️ Hasnain is proficient in Python, PyTorch, TensorFlow, React, Node.js, and MATLAB. Specialized in AI/ML! 🚀";
  }

  // Experience
  if (lower.includes('experience') || lower.includes('work')) {
    if (EXPERIENCE && EXPERIENCE.length > 0) {
      const companies = EXPERIENCE.map(e => e.company).join(', ');
      return `💼 Hasnain has valuable experience at: ${companies}. Ask about specific roles or achievements! 🏢`;
    }
    return "💼 Hasnain has diverse experience in AI, software engineering, and aerospace research. 🚀";
  }

  // Education
  if (lower.includes('education') || lower.includes('degree') || lower.includes('university')) {
    if (EDUCATION && EDUCATION.length > 0) {
      const school = EDUCATION[0].school || EDUCATION[0].institution;
      const gpa = EDUCATION[0].gpa;
      return `🎓 Hasnain studied at ${school} with impressive academics (GPA: ${gpa}). Ask for more details about his educational background! 📚`;
    }
    return "🎓 Ask about Hasnain's educational background and academic achievements! 📚";
  }

  // Contact
  if (lower.includes('contact') || lower.includes('email') || lower.includes('reach')) {
    const email = PERSONAL_INFO?.email || 'his email';
    return `📧 You can reach Hasnain at ${email}. He's always open to interesting opportunities! 💬 You can also connect on 🐙 GitHub or 💼 LinkedIn.`;
  }

  // Timeline / Journey
  if (lower.includes('journey') || lower.includes('path') || lower.includes('career')) {
    return `🚀 Hasnain's journey: Started in Aerospace Engineering 🛸 → Transitioned to AI/ML 🤖 → Now building production systems at USC 🎓. Quite the flight path! ✈️`;
  }

  // About / Bio
  if (lower.includes('who') || lower.includes('about') || lower.includes('background')) {
    return `🤖 Hasnain is a skilled developer and AI enthusiast bridging Aerospace and Machine Learning. He loves building intelligent systems 🧠 and exploring new technologies. 💡 Ask me about his projects, skills, or experience!`;
  }

  // AI/ML specific
  if (lower.includes('ai') || lower.includes('machine learning') || lower.includes('deep learning')) {
    return `🧠 Hasnain specializes in Machine Learning and Deep Learning! 🤖 He's worked on projects like Brain Tumor Segmentation 🏥, Computer Vision 👁️, and NLP with transformers 📝. What aspect interests you? 🎯`;
  }

  // Aerospace
  if (lower.includes('aerospace') || lower.includes('cfd') || lower.includes('aerodynamic')) {
    return `🛸 Hasnain has an Aerospace Engineering background! He's worked on CFD simulations ⚙️, aerodynamic analysis 🌬️, and store separation dynamics 🚀. He bridges the gap between aerospace and AI! 🤖`;
  }

  // Programming languages
  if (lower.includes('python') || lower.includes('java') || lower.includes('cpp') || lower.includes('c++')) {
    return `💻 Hasnain is proficient in multiple languages! His favorites are Python 🐍 (Expert), C++ ⚙️ (Intermediate), Java (Intermediate), and JavaScript (for Web). Ask about specific projects! 🚀`;
  }

  // React / Frontend
  if (lower.includes('react') || lower.includes('frontend') || lower.includes('web')) {
    return `⚛️ Hasnain builds modern web applications with React! 🚀 He's experienced with Tailwind CSS 🎨, Framer Motion ✨, and state management. This portfolio is built with React 19! 💻`;
  }

  // Hasnain's personality
  if (lower.includes('personality') || lower.includes('hobby') || lower.includes('like')) {
    return `🎯 Beyond coding, Hasnain loves: 🍳 Cooking Indian cuisine, 🏋️ Gym workouts, ✈️ Flight simulation (X-Plane), and 📊 Personal finance tracking. He's detail-oriented and curious! 🧠`;
  }

  // Default fallback
  return "🤖 I can help you learn about Hasnain's 💻 projects, 🛠️ skills, 💼 experience, 🎓 education, and how to 📧 contact him. What would you like to know? 🎯";
};
