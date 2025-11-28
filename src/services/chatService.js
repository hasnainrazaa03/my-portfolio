import { PERSONAL_INFO, PROJECTS, SKILLS, EXPERIENCE, EDUCATION } from '../constants';


// Build context string from your constants
const buildContext = () => {
  let context = [];
  
  // Personal info
  if (PERSONAL_INFO) {
    context.push(`Name: ${PERSONAL_INFO.name}`);
    context.push(`Bio: ${PERSONAL_INFO.bioStory}`);
    context.push(`Email: ${PERSONAL_INFO.email}`);
    if (PERSONAL_INFO.socials) {
      context.push(`GitHub: ${PERSONAL_INFO.socials.github}`);
      context.push(`LinkedIn: ${PERSONAL_INFO.socials.linkedin}`);
    }
  }
  
  // Education (all institutions)
  if (EDUCATION && EDUCATION.length > 0) {
    context.push('\nEducation:');
    EDUCATION.forEach(edu => {
      context.push(`- ${edu.degree} at ${edu.school} (${edu.period}) - GPA: ${edu.gpa}`);
    });
  }
  
  // Projects (all 5 with rich details)
  if (PROJECTS && PROJECTS.length > 0) {
    context.push('\nProjects:');
    PROJECTS.forEach(p => {
      context.push(`- ${p.title} (${p.category}): ${p.description}`);
      if (p.techStack) {
        context.push(`  Tech: ${p.techStack.slice(0, 8).join(', ')}`);
      }
    });
  }
  
  // Skills (organized by category)
  if (SKILLS && SKILLS.length > 0) {
    context.push('\nSkills by Category:');
    SKILLS.forEach(skillGroup => {
      const topSkills = skillGroup.items
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 5)
        .map(s => `${s.name} (${s.level})`)
        .join(', ');
      context.push(`- ${skillGroup.category}: ${topSkills}`);
    });
  }
  
  // Experience (all roles with key highlights)
  if (EXPERIENCE && EXPERIENCE.length > 0) {
    context.push('\nProfessional Experience:');
    EXPERIENCE.forEach(exp => {
      context.push(`- ${exp.role} at ${exp.company} (${exp.period})`);
      if (exp.description && exp.description.length > 0) {
        exp.description.slice(0, 2).forEach(point => {
          context.push(`  • ${point}`);
        });
      }
    });
  }
  
  return context.join('\n');
};


export const getChatResponse = async (messages) => {
  const lastUserMessage = messages[messages.length - 1].content;

  try {
    const apiUrl = process.env.NODE_ENV === 'production' 
      ? '/api/chat'
      : 'http://localhost:3000/api/chat';

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
      await response.json().catch(() => ({}));
      return getLocalResponse(lastUserMessage);
    }

    const data = await response.json();
    
    if (!data.reply) {
      return getLocalResponse(lastUserMessage);
    }

    return data.reply;

  } catch (error) {
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
