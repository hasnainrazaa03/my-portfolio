/**
 * Runtime schema validation for all site content in `src/constants.js`.
 *
 * WHY: the portfolio is content-driven — a single malformed entry (a missing
 * `images` array, a typo'd email, a non-URL link) would otherwise fail silently
 * or crash a lazy-loaded section at runtime. These Zod schemas turn a bad edit
 * into a loud, field-level error.
 *
 * USAGE: `validateContent()` is called dev-only from `main.jsx` (guarded by
 * `import.meta.env.DEV`), and exhaustively in `contentSchema.test.js` so CI
 * catches bad content before it ships. It is intentionally NOT run in prod.
 *
 * NOTE: Zod v4 API — top-level `z.email()` / `z.url()` (the chained
 * `z.string().email()` form is deprecated in v4).
 */
import { z } from 'zod';
import {
  PERSONAL_INFO,
  STATS,
  NOW,
  EDUCATION,
  PROJECTS,
  ACHIEVEMENTS,
  SKILLS,
  EXPERIENCE,
} from '../constants';

// An asset reference is either an absolute public path ("/USC.png") or an
// http(s) URL (skill icons are hosted on CDNs).
const assetRef = z
  .string()
  .refine(
    (s) => s.startsWith('/') || /^https?:\/\//.test(s),
    'must be an absolute asset path (starts with "/") or an http(s) URL',
  );

// Lucide icon components are objects/functions; we only assert they're present.
const iconRef = z.custom((v) => v != null, 'icon is required');

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be an ISO date (YYYY-MM-DD)');

export const PersonalInfoSchema = z.object({
  name: z.string().min(1),
  title: z.string().min(1),
  tagline: z.string().min(1),
  bio: z.string().min(1),
  bioHeadline: z.string().min(1),
  bioStory: z.string().min(1),
  email: z.email(),
  socials: z.object({
    github: z.url(),
    linkedin: z.url(),
    instagram: z.url(),
  }),
});

export const StatSchema = z.object({
  target: z.number(),
  label: z.string().min(1),
  suffix: z.string(),
  icon: iconRef,
});

export const NowSchema = z.object({
  updated: isoDate,
  items: z
    .array(
      z.object({
        emoji: z.string().min(1),
        text: z.string().min(1),
      }),
    )
    .min(1),
});

export const EducationSchema = z.object({
  id: z.number(),
  degree: z.string().min(1),
  school: z.string().min(1),
  period: z.string().min(1),
  gpa: z.string().min(1),
  coursework: z.string().min(1),
  image: assetRef,
  url: z.url(),
});

export const ProjectSchema = z.object({
  id: z.number(),
  title: z.string().min(1),
  category: z.enum(['AI/ML', 'Aerospace', 'Full-Stack Web']),
  status: z.string().min(1),
  description: z.string().min(1),
  longDescription: z.string().min(1),
  images: z.array(assetRef).min(1),
  techStack: z.array(z.string().min(1)).min(1),
  links: z.object({
    github: z.url().nullable(),
    demo: z.url().nullable(),
  }),
});

export const AchievementSchema = z.object({
  category: z.string().min(1),
  year: z.string().min(1),
  title: z.string().min(1),
  issuer: z.string().min(1),
  detail: z.string().min(1),
  url: z.url().nullable(),
});

export const SkillItemSchema = z.object({
  name: z.string().min(1),
  level: z.string().min(1),
  pct: z.number().min(0).max(100),
  image: assetRef,
});

export const SkillGroupSchema = z.object({
  category: z.string().min(1),
  icon: iconRef,
  items: z.array(SkillItemSchema).min(1),
});

export const ExperienceSchema = z.object({
  id: z.number(),
  role: z.string().min(1),
  company: z.string().min(1),
  period: z.string().min(1),
  location: z.string().min(1),
  logo: assetRef,
  description: z.array(z.string().min(1)).min(1),
});

/**
 * Map of every content export to the schema it must satisfy. Array exports are
 * wrapped with `z.array(...)`. Keeping this as data lets `validateContent()`
 * iterate and aggregate every failure in one pass.
 */
export const CONTENT_SCHEMAS = {
  PERSONAL_INFO: PersonalInfoSchema,
  STATS: z.array(StatSchema).min(1),
  NOW: NowSchema,
  EDUCATION: z.array(EducationSchema).min(1),
  PROJECTS: z.array(ProjectSchema).min(1),
  ACHIEVEMENTS: z.array(AchievementSchema).min(1),
  SKILLS: z.array(SkillGroupSchema).min(1),
  EXPERIENCE: z.array(ExperienceSchema).min(1),
};

const CONTENT_VALUES = {
  PERSONAL_INFO,
  STATS,
  NOW,
  EDUCATION,
  PROJECTS,
  ACHIEVEMENTS,
  SKILLS,
  EXPERIENCE,
};

/**
 * Validate every content export. Returns an array of human-readable error
 * strings (empty array = all valid). Aggregates across ALL exports rather than
 * throwing on the first failure, so one run surfaces every problem.
 *
 * @param {Record<string, unknown>} [values] override content (used in tests)
 * @returns {string[]} error messages, each prefixed with the export + field path
 */
export function collectContentErrors(values: Record<string, unknown> = CONTENT_VALUES) {
  const errors = [];
  for (const [name, schema] of Object.entries(CONTENT_SCHEMAS)) {
    const result = schema.safeParse(values[name]);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const path = issue.path.length ? issue.path.join('.') : '(root)';
        errors.push(`${name}.${path}: ${issue.message}`);
      }
    }
  }
  return errors;
}

/**
 * Throws an aggregated error if any content is invalid. No-op when valid.
 * Called dev-only from main.jsx and asserted in tests.
 */
export function validateContent(values: Record<string, unknown> = CONTENT_VALUES) {
  const errors = collectContentErrors(values);
  if (errors.length > 0) {
    throw new Error(
      `Invalid site content (${errors.length} issue${errors.length > 1 ? 's' : ''}):\n` +
        errors.map((e) => `  • ${e}`).join('\n'),
    );
  }
}
