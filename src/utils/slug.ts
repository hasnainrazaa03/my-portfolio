/**
 * slug.ts — stable URL slugs for project detail pages.
 *
 * A slug is a PUBLIC, LINKABLE identifier: once someone shares
 * /projects/project-vimaan, that URL has to keep working. So this derives from
 * the title deterministically and the result is pinned by tests — a title edit
 * that would silently change a live URL fails rather than breaking the link.
 *
 * Titles here contain characters that all need handling: "PeakRoutine - AI
 * Health & Wellness Platform" (ampersand, spaced hyphen), "Brain Tumor
 * Segmentation (BraTS 2021 - Vision Transformer)" (parentheses), "RVSAT-1
 * (Team Antariksh)" (an internal hyphen that must survive).
 */

/** `"Brain Tumor Segmentation (BraTS 2021)"` -> `"brain-tumor-segmentation-brats-2021"` */
export function toSlug(title: string): string {
  return String(title ?? '')
    .normalize('NFKD')
    // Strip diacritics so "Résumé" and "Resume" cannot produce two URLs.
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    // Everything that is not a letter, digit or hyphen becomes a separator.
    .replace(/[^a-z0-9-]+/g, '-')
    // Collapse runs, including those created by a spaced hyphen ("a - b").
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** The canonical path for a project. */
export function projectPath(title: string): string {
  return `/projects/${toSlug(title)}`;
}

/**
 * Parse a pathname into a project slug, or null when it is not a project URL.
 * Tolerates a trailing slash, as the rest of this app's routing does.
 */
export function parseProjectPath(pathname: string): string | null {
  const m = /^\/projects\/([^/]+)\/?$/.exec(String(pathname ?? ''));
  return m ? m[1].toLowerCase() : null;
}
