/**
 * Central client-side environment configuration.
 *
 * WHY: Vite exposes only `VITE_`-prefixed vars to the browser. They were read
 * ad-hoc across components (Contact, analytics, Chatbot) with no presence check,
 * so a missing key failed silently at runtime. This module is the single place
 * that reads them, derives `isConfigured` flags, and lets the UI degrade
 * gracefully (e.g. disable the contact form instead of throwing).
 *
 * `readEnv(source)` takes the env source as a param so it's unit-testable with a
 * fake object; the exported `env` singleton binds it to `import.meta.env`.
 */

/**
 * @param {Record<string, string|undefined>} source
 */
export function readEnv(source = import.meta.env) {
  const serviceId = source.VITE_EMAILJS_SERVICE_ID || '';
  const templateId = source.VITE_EMAILJS_TEMPLATE_ID || '';
  const publicKey = source.VITE_EMAILJS_PUBLIC_KEY || '';

  const emailjs = {
    serviceId,
    templateId,
    publicKey,
    // The contact form needs all three to send.
    isConfigured: Boolean(serviceId && templateId && publicKey),
  };

  return {
    emailjs,
    // Public write-gate token for analytics (not a secret admin key).
    analyticsWriteToken: source.VITE_ANALYTICS_WRITE_TOKEN || '',
    // Build flag — include the in-chat analytics viewer in the bundle.
    adminEnabled: source.VITE_ENABLE_ADMIN === 'true',
  };
}

export const env = readEnv();

/**
 * DEV-only: warn (once) about missing-but-expected client config. Returns the
 * list of warning strings emitted (for testing). No-op effect in prod.
 * @param {ReturnType<typeof readEnv>} [e]
 * @param {(msg: string) => void} [log]
 */
export function warnMissingEnv(e = env, log = console.warn) {
  const warnings = [];
  if (!e.emailjs.isConfigured) {
    warnings.push(
      '[env] EmailJS not fully configured — the contact form will be disabled. ' +
        'Set VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID and VITE_EMAILJS_PUBLIC_KEY in .env.local',
    );
  }
  warnings.forEach((w) => log(w));
  return warnings;
}
