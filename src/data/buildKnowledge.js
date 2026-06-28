/**
 * buildKnowledge.js — derives the chatbot's factual knowledge block from the
 * canonical site content (src/constants.js).
 *
 * WHY: previously the chat system prompt hardcoded a second copy of the résumé
 * (projects, experience, skills, education). That copy silently drifted from
 * constants.js. This builder makes constants.js the single source of truth: a
 * profile update flows into the bot's knowledge with zero edits to api/chat.js.
 *
 * DESIGN: a PURE function — no React/DOM/lucide imports, no module-level state —
 * so it runs unchanged in the Vercel serverless runtime and is trivially
 * unit-testable. The caller (api/chat.js) supplies the content.
 *
 * Only the FACTS are generated here. The security directives and response-style
 * rules stay as static text in api/chat.js.
 */

/**
 * @param {object} content
 * @param {object} content.personalInfo  PERSONAL_INFO
 * @param {Array}  content.projects      PROJECTS
 * @param {Array}  content.experience    EXPERIENCE
 * @param {Array}  content.skills        SKILLS
 * @param {Array}  content.education     EDUCATION
 * @returns {string} plain-text knowledge block (the `=== ABOUT ME ===` section)
 */
export function buildKnowledgeBlock({ personalInfo, projects, experience, skills, education }) {
  // Headline facts — derived from data, not restated. EDUCATION[0] is the most
  // recent/primary degree by convention in constants.js.
  const primary = education?.[0];
  const roleLine = primary
    ? `${primary.degree} at ${primary.school} (${primary.gpa} GPA)`
    : 'MSCS Student';

  const lines = [];
  lines.push('=== ABOUT ME ===');
  lines.push(`Name: ${personalInfo.name}`);
  lines.push(`Role: ${roleLine}`);
  // Background + Passion are stable positioning statements, not per-update facts.
  lines.push('Background: Aerospace Engineer → AI/ML Engineer');
  lines.push('Passion: Building production AI systems, NLP, computer vision, full-stack systems');

  lines.push('');
  lines.push('KEY PROJECTS:');
  projects.forEach((p, i) => {
    lines.push(`${i + 1}. ${p.title} — ${p.description}`);
  });

  lines.push('');
  lines.push('WORK EXPERIENCE:');
  experience.forEach((e) => {
    lines.push(`- ${e.company} — ${e.role} (${e.period})`);
  });

  lines.push('');
  lines.push('SKILLS:');
  skills.forEach((group) => {
    const names = group.items.map((it) => it.name).join(', ');
    lines.push(`- ${group.category}: ${names}`);
  });

  lines.push('');
  lines.push('EDUCATION:');
  education.forEach((ed) => {
    lines.push(`- ${ed.degree} — ${ed.school} (${ed.period}, ${ed.gpa})`);
  });

  return lines.join('\n');
}
