import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Diagnostic probe: imports each shared module in isolation and reports which
 * one fails to load, with its error. Static string literals so the bundler
 * emits real chunks; each import is awaited inside its own try/catch.
 */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const results: Record<string, string> = { node: process.version };

  const probe = async (name: string, load: () => Promise<unknown>) => {
    try {
      await load();
      results[name] = 'ok';
    } catch (e) {
      results[name] = e instanceof Error ? `${e.name}: ${e.message}`.slice(0, 400) : String(e);
    }
  };

  await probe('cors', () => import('./_lib/cors.js'));
  await probe('rateLimit', () => import('./_lib/rateLimit.js'));
  await probe('sanitize', () => import('./_lib/sanitize.js'));
  await probe('hashIp', () => import('./_lib/hashIp.js'));
  await probe('replyFormat', () => import('./_lib/replyFormat.js'));
  await probe('history', () => import('./_lib/history.js'));
  await probe('llm', () => import('./_lib/llm.js'));
  await probe('constants', () => import('../src/constants.js'));
  await probe('buildKnowledge', () => import('../src/data/buildKnowledge.js'));

  // Presence only — never values. Tells us which providers the chain can even
  // attempt, which is otherwise invisible without Vercel log access.
  const present = (k: string) => Boolean(process.env[k]);
  res.status(200).json({
    ...results,
    keys: {
      ANTHROPIC_API_KEY: present('ANTHROPIC_API_KEY'),
      GEMINI_API_KEY: present('GEMINI_API_KEY'),
      HUGGINGFACE_API_KEY: present('HUGGINGFACE_API_KEY'),
      LLM_CHAIN: process.env.LLM_CHAIN || '(default)',
      ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || '(default)',
      GEMINI_MODEL: process.env.GEMINI_MODEL || '(default)',
      legacy_LLM_PROVIDER: process.env.LLM_PROVIDER || '(unset)',
    },
  });
}
