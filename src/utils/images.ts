/**
 * images.ts — asset-path helpers.
 *
 * Lives outside the component file so Fast Refresh keeps working
 * (react-refresh/only-export-components: a module that exports a component
 * must export only components).
 */

/**
 * Local raster path we ship a .webp sibling for. Deliberately NOT remote URLs.
 *
 * The `(?!\/)` matters: a protocol-relative URL ("//cdn.example/x.png") also
 * starts with a slash but is remote, and we have no sibling for it.
 */
const LOCAL_RASTER = /^\/(?!\/)[^?#]+\.(png|jpe?g)$/i;

/**
 * Derive the sibling `.webp` for a local raster path, or null when we can't
 * guarantee one exists.
 *
 * Guessing is unsafe for remote URLs: if a <picture> <source> is selected and
 * then fails to load, the browser does NOT fall back to the <img> src — it
 * renders broken. Every local raster under public/ has a generated sibling
 * (see the asset pipeline note in README), so derivation is safe there only.
 */
export function toWebpSrc(src: string): string | null {
  return LOCAL_RASTER.test(src) ? src.replace(/\.(png|jpe?g)$/i, '.webp') : null;
}
