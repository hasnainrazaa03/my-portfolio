import { PERSONAL_INFO, EDUCATION, EXPERIENCE, SKILLS, PROJECTS } from '../../constants';

/**
 * resumeData.ts — one shaping of `constants.ts` for both résumé views.
 *
 * The designed view and the ATS view must never disagree about what the résumé
 * says; only about how it looks. Anything that decides CONTENT — which
 * projects are selected, how a period is written, how bullets are normalised —
 * lives here so both render the same facts.
 */

/** The headline under the name. Not in constants because it is résumé-specific framing. */
export const RESUME_HEADLINE = 'MSCS @ USC · AI / ML Engineer · Aerospace background';

/** Projects the résumé shows. A one-pager cannot carry all nine. */
export const RESUME_PROJECT_COUNT = 5;

export interface ContactLine {
  label: string;
  /** The full URL, which is what an ATS needs to see as text. */
  value: string;
  href: string;
}

/**
 * Contact details as label + FULL URL.
 *
 * The designed view hyperlinks the words "GitHub" and "LinkedIn". That reads
 * well and parses badly: an ATS extracts the anchor text, not the href, so the
 * résumé arrived carrying the literal strings "GitHub" and "LinkedIn" and no
 * way to reach either profile. The ATS view prints `value`.
 */
export function contactLines(): ContactLine[] {
  return [
    { label: 'Email', value: PERSONAL_INFO.email, href: `mailto:${PERSONAL_INFO.email}` },
    { label: 'GitHub', value: strip(PERSONAL_INFO.socials.github), href: PERSONAL_INFO.socials.github },
    { label: 'LinkedIn', value: strip(PERSONAL_INFO.socials.linkedin), href: PERSONAL_INFO.socials.linkedin },
  ];
}

/** `https://github.com/x` -> `github.com/x` — shorter to read, still unambiguous. */
function strip(url: string): string {
  return String(url).replace(/^https?:\/\//, '').replace(/\/$/, '');
}

/** Experience bullets, normalised: `description` is a string on some entries and an array on others. */
export function bullets(description: unknown): string[] {
  return (Array.isArray(description) ? description : [description]).filter(
    (line): line is string => typeof line === 'string' && line.trim().length > 0,
  );
}

export const resumeSections = () => ({
  education: EDUCATION,
  experience: EXPERIENCE,
  projects: PROJECTS.slice(0, RESUME_PROJECT_COUNT),
  skills: SKILLS,
});

export { PERSONAL_INFO };
