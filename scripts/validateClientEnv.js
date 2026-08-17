/**
 * Build-time validation of `VITE_` client environment variables.
 *
 * WHY THIS EXISTS
 * ---------------
 * Vercel's dashboard renders saved env values masked as bullet characters.
 * Copying that display back into the field stores a run of U+2022 as the actual
 * value — and it is invisible to every check we had:
 *
 *   - it is non-empty, so `Boolean(token)` presence checks pass
 *   - it is the right length, so nothing looks suspicious in the UI
 *   - Vite happily inlines it into the production bundle
 *
 * Production shipped `VITE_ANALYTICS_WRITE_TOKEN` as 64 bullets. The browser
 * sent it on every analytics write, the server compared it against the real
 * `ANALYTICS_WRITE_TOKEN` and answered 401 — for every visitor, silently,
 * because the analytics client fails soft by design. Nothing surfaced it; it
 * took decoding the shipped bundle byte-by-byte to find.
 *
 * A presence check structurally cannot catch this. Fail the build instead: a
 * red deploy is cheap, a quietly broken one is not.
 */

/**
 * Characters password/secret fields use to mask a value. A real credential is
 * never composed entirely of these.
 */
const MASK_CHARS = new Set([
  '•', // • BULLET — what Vercel renders
  '·', // · MIDDLE DOT
  '●', // ● BLACK CIRCLE
  '▪', // ▪ BLACK SMALL SQUARE
  '∙', // ∙ BULLET OPERATOR
  '*', // * ASTERISK
]);

/**
 * Variables the PLATFORM injects, which no human ever typed into a form.
 *
 * Vercel exposes its whole system family to the build, and because Vite
 * forwards every `VITE_`-prefixed variable, they land here alongside real
 * config. They are exempt from the whitespace heuristic below — that rule
 * assumes a hand-pasted single-line credential, which these are not.
 *
 * This is not hypothetical tidying: the rule as first written failed a
 * production deploy on `VITE_VERCEL_GIT_COMMIT_MESSAGE`, whose value is the
 * commit message itself. Multi-line commit messages end in a newline, so every
 * deploy with one was rejected as "a stray newline from a copy-paste".
 */
const PLATFORM_PREFIXES = ['VITE_VERCEL_'];

/**
 * @typedef {{ key: string, fatal: boolean, message: string }} EnvProblem
 */

/**
 * Inspect client env vars for values that are present but structurally wrong.
 *
 * Only `VITE_`-prefixed keys are examined: those are the ones Vite inlines into
 * the browser bundle, and the only ones this build can see.
 *
 * @param {Record<string, string | undefined>} env
 * @returns {EnvProblem[]}
 */
export function findEnvProblems(env) {
  /** @type {EnvProblem[]} */
  const problems = [];

  for (const [key, raw] of Object.entries(env || {})) {
    if (!key.startsWith('VITE_')) continue;
    if (typeof raw !== 'string' || raw === '') continue;

    // Spread rather than index: a masked value could contain astral characters,
    // and `.every` over UTF-16 code units would see lone surrogates.
    const chars = [...raw];

    if (chars.every((c) => MASK_CHARS.has(c))) {
      problems.push({
        key,
        fatal: true,
        message:
          `${key} is ${chars.length} mask characters (${JSON.stringify(chars[0])}), not a real value. ` +
          `This is what a secrets UI *displays* — the value was copied from the masked ` +
          `display instead of the original. Re-enter the real value.`,
      });
      continue;
    }

    // The whitespace heuristic only makes sense for a single-line value someone
    // pasted by hand. Skip anything the platform injected, and anything whose
    // value is genuinely multi-line (a commit message, an embedded JSON blob) —
    // there a newline is content, not a paste artifact.
    const platformInjected = PLATFORM_PREFIXES.some((p) => key.startsWith(p));
    const multiline = /[\r\n]/.test(raw.trim());
    if (!platformInjected && !multiline && raw.trim() !== raw) {
      problems.push({
        key,
        fatal: true,
        message:
          `${key} has leading or trailing whitespace, which is almost always a stray ` +
          `newline from a copy-paste. It is sent verbatim and will not match on the ` +
          `other side. Re-enter it without surrounding whitespace.`,
      });
    }
  }

  return problems;
}

/**
 * Vite plugin wrapper. Throws on fatal problems so the build fails loudly
 * rather than shipping a bundle that is broken for every visitor.
 *
 * @param {(mode: string) => Record<string, string>} loadEnvFor
 * @returns {import('vite').Plugin}
 */
export function validateClientEnv(loadEnvFor) {
  return {
    name: 'validate-client-env',
    config(_config, { mode }) {
      const problems = findEnvProblems(loadEnvFor(mode));
      if (!problems.length) return;

      const rendered = problems.map((p) => `  ✗ ${p.message}`).join('\n');
      throw new Error(`Invalid client environment variables:\n${rendered}\n`);
    },
  };
}
