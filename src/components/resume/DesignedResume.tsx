import React from 'react';
import { PERSONAL_INFO, RESUME_HEADLINE, bullets, contactLines, resumeSections } from './resumeData';

/**
 * DesignedResume — the résumé as a person reads it: two-column headers, dates
 * ranged right, compact type. `AtsResume` is the same content shaped for a
 * parser; both take their facts from `resumeData` so they cannot disagree.
 */
const DesignedResume = () => {
  const { education, experience, projects, skills } = resumeSections();

  return (
    <article className="max-w-3xl mx-auto px-6 py-10 print:py-4 print:px-4">
      <header className="border-b border-slate-300 pb-4 mb-6">
        <h1 className="text-3xl font-bold">{PERSONAL_INFO.name}</h1>
        <p className="text-sm text-slate-700 mt-1">{RESUME_HEADLINE}</p>
        <p className="text-sm text-slate-700">
          {contactLines().map((c, i) => (
            <React.Fragment key={c.label}>
              {i > 0 && ' · '}
              <a className="underline" href={c.href} rel="noreferrer noopener">
                {c.label === 'Email' ? c.value : c.label}
              </a>
            </React.Fragment>
          ))}
        </p>
      </header>

      <section className="mb-6">
        <h2 className="text-base font-bold uppercase tracking-wider border-b border-slate-300 pb-1 mb-3">
          Education
        </h2>
        {education.map((edu) => (
          <div key={edu.id} className="mb-3">
            <div className="flex justify-between items-baseline">
              <strong className="text-sm">{edu.school}</strong>
              <span className="text-xs text-slate-600">{edu.period}</span>
            </div>
            <div className="text-sm italic">{edu.degree}</div>
            {edu.gpa && (
              <div className="text-xs text-slate-700">
                GPA: {edu.gpa}
                {edu.honors ? ` · ${edu.honors}` : ''}
              </div>
            )}
            {edu.coursework && (
              <div className="text-xs text-slate-600 mt-0.5">
                <span className="font-medium">Coursework:</span> {edu.coursework}
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="mb-6">
        <h2 className="text-base font-bold uppercase tracking-wider border-b border-slate-300 pb-1 mb-3">
          Experience
        </h2>
        {experience.map((exp) => (
          <div key={exp.id} className="mb-4">
            <div className="flex justify-between items-baseline">
              <strong className="text-sm">
                {exp.role} · {exp.company}
              </strong>
              <span className="text-xs text-slate-600">{exp.period}</span>
            </div>
            {exp.location && <div className="text-xs italic text-slate-600">{exp.location}</div>}
            <ul className="mt-1 list-disc pl-5 space-y-0.5 text-xs leading-snug">
              {bullets(exp.description).map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="mb-6">
        <h2 className="text-base font-bold uppercase tracking-wider border-b border-slate-300 pb-1 mb-3">
          Selected Projects
        </h2>
        {projects.map((p) => (
          <div key={p.id} className="mb-3">
            <div className="flex justify-between items-baseline">
              <strong className="text-sm">{p.title}</strong>
              <span className="text-xs text-slate-600">{p.category}</span>
            </div>
            <div className="text-xs">{p.description}</div>
            {p.techStack?.length > 0 && (
              <div className="text-[11px] text-slate-600 mt-0.5">
                <em>Tech:</em> {p.techStack.slice(0, 8).join(', ')}
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="mb-6">
        <h2 className="text-base font-bold uppercase tracking-wider border-b border-slate-300 pb-1 mb-3">
          Skills
        </h2>
        {skills.map((group) => (
          <div key={group.category} className="text-xs mb-1.5">
            <strong>{group.category}:</strong> {group.items.map((s) => s.name).join(', ')}
          </div>
        ))}
      </section>

      <footer className="text-[10px] text-slate-500 text-center pt-2 border-t border-slate-200">
        Generated from portfolio data · hasnainrazaa.vercel.app
      </footer>
    </article>
  );
};

export default DesignedResume;
