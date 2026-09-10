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
 *
 * Decodes and lowercases, so a link that survived a mail client or a wiki
 * still resolves: `window.location.pathname` keeps percent-escapes that the
 * host has already normalised away, which meant `/projects/usc%2Dledger` was
 * answered 200 with the right page's <head> by the server and then rendered
 * "that project doesn't exist" by the app.
 *
 * `canonicalProjectPath` exists because the reverse also happened: a
 * case-mismatched URL rendered the case study while the host answered 404.
 */
export function parseProjectPath(pathname: string): string | null {
  const m = /^\/projects\/([^/]+)\/?$/.exec(String(pathname ?? ''));
  if (!m) return null;
  let raw = m[1];
  try {
    raw = decodeURIComponent(raw);
  } catch {
    // A malformed escape ("%zz") is not a slug; keep the raw text and let the
    // lookup miss, rather than throwing during render.
  }
  return raw.toLowerCase();
}

/**
 * The canonical URL for a pathname that resolved to `slug`, or null when the
 * pathname already IS canonical.
 *
 * Only lowercase, unescaped paths exist as files, so anything else is served
 * by the 404 shell — the visitor sees a complete case study at a URL that
 * every crawler, link checker and unfurl records as dead. Sending the browser
 * to the real URL fixes both halves.
 */
export function canonicalProjectPath(pathname: string): string | null {
  const slug = parseProjectPath(pathname);
  if (!slug) return null;
  const canonical = `/projects/${slug}`;
  return pathname === canonical ? null : canonical;
}
