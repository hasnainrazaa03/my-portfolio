import React from 'react';
import { PERSONAL_INFO, RESUME_HEADLINE, bullets, contactLines, resumeSections } from './resumeData';

/**
 * AtsResume — the same résumé, shaped for a machine rather than a reader.
 *
 * Applicant tracking systems extract text and then guess at structure. The
 * things that make the designed view read well are the things that make that
 * guess wrong:
 *
 *   - Side-by-side columns (`flex justify-between` for role and dates) can be
 *     linearised out of order, gluing a date onto the next heading.
 *   - Hyperlinked words hide their URL: the designed header links the text
 *     "GitHub", so an extractor gets the word and not the profile.
 *   - Middot separators and en dashes come through as noise, or not at all.
 *   - Non-standard section names ("Flight Log") do not map to the fields a
 *     parser is looking for.
 *
 * So this is one column, one fact per line, standard section names, real
 * `<ul>` bullets, full URLs as text, and no decoration. It is deliberately
 * plain — that is the feature. Content comes from the same `resumeData`
 * module as the designed view, so the two can differ in looks and never in
 * what they claim.
 */
const AtsResume = () => {
  const { education, experience, projects, skills } = resumeSections();

  return (
    <article className="max-w-3xl mx-auto px-6 py-10 print:py-4 print:px-0 text-slate-900 text-[13px] leading-relaxed">
      <header className="mb-5">
        <h1 className="text-2xl font-bold">{PERSONAL_INFO.name}</h1>
        <p>{RESUME_HEADLINE.replace(/ · /g, ' | ')}</p>
        {contactLines().map((c) => (
          <p key={c.label}>
            {c.label}:{' '}
            <a href={c.href} className="underline" rel="noreferrer noopener">
              {c.value}
            </a>
          </p>
        ))}
      </header>

      <section className="mb-5">
        <h2 className="text-sm font-bold uppercase mb-2">Education</h2>
        {education.map((edu) => (
          <div key={edu.id} className="mb-2">
            <p className="font-bold">{edu.school}</p>
            <p>{edu.degree}</p>
            <p>{edu.period}</p>
            {edu.gpa && <p>GPA: {edu.gpa}</p>}
            {edu.honors && <p>Honors: {edu.honors}</p>}
            {edu.coursework && <p>Relevant coursework: {edu.coursework}</p>}
          </div>
        ))}
      </section>

      <section className="mb-5">
        <h2 className="text-sm font-bold uppercase mb-2">Experience</h2>
        {experience.map((exp) => (
          <div key={exp.id} className="mb-3">
            {/* Role and company on separate lines: a parser that splits on the
                separator otherwise attributes the role to the wrong employer. */}
            <p className="font-bold">{exp.role}</p>
            <p>{exp.company}</p>
            <p>
              {exp.period}
              {exp.location ? `, ${exp.location}` : ''}
            </p>
            <ul className="list-disc pl-5 mt-1">
              {bullets(exp.description).map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="mb-5">
        <h2 className="text-sm font-bold uppercase mb-2">Projects</h2>
        {projects.map((p) => (
          <div key={p.id} className="mb-2">
            <p className="font-bold">{p.title}</p>
            <p>{p.description}</p>
            {p.techStack?.length > 0 && <p>Technologies: {p.techStack.join(', ')}</p>}
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-sm font-bold uppercase mb-2">Skills</h2>
        {skills.map((group) => (
          <p key={group.category}>
            {group.category}: {group.items.map((s) => s.name).join(', ')}
          </p>
        ))}
      </section>
    </article>
  );
};

export default AtsResume;
