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

  // Optional live chain probe: ?chain=1 runs a trivial prompt through the
  // provider chain and reports each provider's error. Temporary diagnostic.
  let chain: unknown = 'skipped (pass ?chain=1)';
  if (_req.query?.chain === '1') {
    const { runChain } = await import('./_lib/llm.js');
    const attempts: unknown[] = [];
    try {
      const r = await runChain('You are a test.', [{ role: 'user', content: 'Say OK.' }],
        (a) => attempts.push(a));
      chain = { ok: true, provider: r.provider, model: r.model, text: r.text.slice(0, 80), attempts };
    } catch (e) {
      chain = { ok: false, attempts, error: e instanceof Error ? e.message.slice(0, 500) : String(e) };
    }
  }

  // ?models=1 lists the Gemini models this key may actually call. The catalog
  // shifts and old model IDs get retired for new keys, so ask rather than guess.
  let geminiModels: unknown = 'skipped (pass ?models=1)';
  if (_req.query?.models === '1' && process.env.GEMINI_API_KEY) {
    try {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY },
      });
      const j = (await r.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
      geminiModels = (j.models ?? [])
        .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m) => m.name.replace('models/', ''))
        .filter((n) => /flash|lite/i.test(n));
    } catch (e) {
      geminiModels = e instanceof Error ? e.message : String(e);
    }
  }

  // ?hf=1 lists what this HuggingFace token can route to. The default model
  // errors with "not supported by any provider you have".
  let hfModels: unknown = 'skipped (pass ?hf=1)';
  if (_req.query?.hf === '1' && process.env.HUGGINGFACE_API_KEY) {
    try {
      const r = await fetch('https://router.huggingface.co/v1/models', {
        headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` },
      });
      const j = (await r.json()) as { data?: { id: string }[] };
      hfModels = (j.data ?? []).map((m) => m.id).filter((id) => /instruct|chat|it$/i.test(id)).slice(0, 25);
    } catch (e) {
      hfModels = e instanceof Error ? e.message : String(e);
    }
  }

  // Presence only — never values. Tells us which providers the chain can even
  // attempt, which is otherwise invisible without Vercel log access.
  const present = (k: string) => Boolean(process.env[k]);
  res.status(200).json({
    ...results,
    chain,
    geminiModels,
    hfModels,
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
