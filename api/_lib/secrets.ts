/**
 * Runtime validation of server-side secrets.
 *
 * WHY THIS EXISTS (the client-side twin lives in scripts/validateClientEnv.js)
 * --------------------------------------------------------------------------
 * Vercel's dashboard renders saved env values masked as bullet characters.
 * Copying that display back into the field stores a run of U+2022 as the real
 * value. Production already shipped `VITE_ANALYTICS_WRITE_TOKEN` that way: 64
 * bullets, non-empty, right length, silently 401'ing every visitor.
 *
 * The Vite plugin catches that for `VITE_` vars because they are inlined at
 * build time. Server secrets are read at *runtime* and are invisible to the
 * build, so they need this check instead. The duplication is deliberate — the
 * two run on opposite sides of the build boundary, under different module
 * systems, and neither can import the other.
 *
 * The stakes are higher here than on the client. A masked value is not a random
 * string, it is a *predictable* one: if `ANALYTICS_SECRET_TOKEN` were ever
 * stored as bullets, anyone who knows this failure mode could send 64 bullets
 * as a bearer token and dump up to 1000 rows of visitor questions. Treating a
 * mask-only value as absent turns a silent auth bypass into a plain 401.
 */

/** Characters a secrets UI uses to hide a value. No real credential is only these. */
const MASK_CHARS = new Set(['•', '·', '●', '▪', '∙', '*']);

/** Warn once per process per variable — serverless logs are noisy enough. */
const warned = new Set<string>();

/**
 * Return the secret if it is usable, or `null` if it is absent or is a masked
 * placeholder. Callers must treat `null` exactly as "not configured".
 *
 * Note this does NOT trim: a token with stray whitespace is wrong, but it is
 * wrong in a way that fails loudly and visibly at the comparison. Silently
 * trimming would paper over a mismatch the operator needs to see and fix.
 */
export function usableSecret(value: string | undefined | null, name: string): string | null {
  if (typeof value !== 'string' || value === '') return null;

  // Spread, not index: a pasted value may contain astral characters, and
  // iterating UTF-16 code units would compare lone surrogates.
  const chars = [...value];
  if (chars.every((c) => MASK_CHARS.has(c))) {
    if (!warned.has(name)) {
      warned.add(name);
      console.error(
        `[env] ${name} is ${chars.length} mask characters, not a real value — it was ` +
          `copied from a secrets UI's masked display. Treating it as UNSET. ` +
          `Re-enter the original value in the project's environment variables.`,
      );
    }
    return null;
  }

  return value;
}

/** Test seam: the once-per-process warning would otherwise leak across cases. */
export function resetSecretWarnings(): void {
  warned.clear();
}
