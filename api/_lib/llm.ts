import Anthropic from '@anthropic-ai/sdk';

/**
 * llm.ts — multi-provider chat backend with an ordered fallback chain.
 *
 * CONFIGURATION (all server-only; never exposed to the client)
 * ────────────────────────────────────────────────────────────
 *   LLM_CHAIN            Ordered, comma-separated provider list.
 *                        Default: "anthropic,gemini,huggingface"
 *   ANTHROPIC_API_KEY    Anthropic key.       ANTHROPIC_MODEL (default claude-sonnet-5)
 *   GEMINI_API_KEY       Google AI Studio.    GEMINI_MODEL    (default gemini-2.5-flash)
 *   HUGGINGFACE_API_KEY  HF Inference token.  HF_MODEL        (default Llama-3-8B-Instruct)
 *   LLM_TIMEOUT_MS       Per-provider budget (default 8000).
 *
 * Providers with no key configured are skipped silently, so a deploy that only
 * sets GEMINI_API_KEY simply runs Gemini-first with no code change. If every
 * configured provider fails, `runChain` throws and the caller falls back to the
 * canned local responder in src/services/chatService.ts.
 *
 * The chain is server-side ONLY. The client cannot request a provider or model
 * — that would be a cost-steering vector. See api/chat.ts.
 */

export type ProviderName = 'anthropic' | 'gemini' | 'huggingface';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface LlmResult {
  text: string;
  provider: ProviderName;
  model: string;
}

export interface ProviderAttempt {
  provider: ProviderName;
  error: string;
}

const VALID_PROVIDERS: readonly ProviderName[] = ['anthropic', 'gemini', 'huggingface'];
const DEFAULT_CHAIN: ProviderName[] = ['anthropic', 'gemini', 'huggingface'];

/** Answers are 1-3 sentences; this is headroom, not a target. */
const MAX_OUTPUT_TOKENS = 320;

function timeoutMs(): number {
  const parsed = Number.parseInt(process.env.LLM_TIMEOUT_MS || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 8000;
}

/**
 * Parse LLM_CHAIN into an ordered, de-duplicated provider list.
 * Unknown names are dropped rather than throwing — a typo in an env var
 * should degrade the chain, not take the endpoint down.
 */
export function resolveChain(raw: string | undefined = process.env.LLM_CHAIN): ProviderName[] {
  const parsed = (raw || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is ProviderName => (VALID_PROVIDERS as readonly string[]).includes(s));

  const deduped = [...new Set(parsed)];
  return deduped.length ? deduped : DEFAULT_CHAIN;
}

// ── Anthropic ──────────────────────────────────────────────────────────────

type ThinkingMode = 'omit' | 'disable';

interface AnthropicTuning {
  /**
   * `omit` = leave the param off. `disable` = send {type:'disabled'}.
   * Models differ: Sonnet 5 / Opus 5 / 4.8 / 4.7 run adaptive thinking by
   * DEFAULT, which is pure latency + cost for a 2-sentence persona reply, so
   * we turn it off explicitly. Fable/Mythos reject `disabled` outright (400) —
   * thinking is always on there. Haiku 4.5 and the 4.6 family default to off,
   * so omitting is both correct and the safest wire shape.
   */
  thinking: ThinkingMode;
  /** `output_config.effort` is GA on 4.6+; it ERRORS on Haiku 4.5 / Sonnet 4.5. */
  effort: 'low' | null;
  /** temperature is REJECTED (400) on Sonnet 5 / Opus 4.7+ / Fable. */
  temperature: number | null;
}

export function tuningFor(model: string): AnthropicTuning {
  // Always-on thinking, sampling params removed.
  if (/^claude-(fable|mythos)-5/.test(model)) {
    return { thinking: 'omit', effort: 'low', temperature: null };
  }
  // Thinking on by default, sampling params removed.
  if (/^claude-(sonnet-5|opus-5|opus-4-8|opus-4-7)/.test(model)) {
    return { thinking: 'disable', effort: 'low', temperature: null };
  }
  // 4.6 family: thinking off unless requested, effort GA, sampling allowed.
  if (/^claude-(sonnet-4-6|opus-4-6)/.test(model)) {
    return { thinking: 'omit', effort: 'low', temperature: 0.4 };
  }
  // Haiku 4.5 / Sonnet 4.5 / anything unrecognised: most conservative shape
  // that cannot 400 — no thinking config, no effort.
  return { thinking: 'omit', effort: null, temperature: 0.4 };
}

async function callAnthropic(system: string, turns: ChatTurn[]): Promise<LlmResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
  const tuning = tuningFor(model);
  const client = new Anthropic({ apiKey, timeout: timeoutMs(), maxRetries: 1 });

  const response = await client.messages.create({
    model,
    max_tokens: MAX_OUTPUT_TOKENS,
    // The system prompt is byte-identical across every request, so a cache
    // breakpoint here is free upside. NOTE: at ~1K tokens this prompt sits
    // below the minimum cacheable prefix on most models, so caching will not
    // actually engage until the generated knowledge block grows — it costs
    // nothing to leave in place and starts paying off automatically.
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: turns.map((t) => ({ role: t.role, content: t.content })),
    ...(tuning.thinking === 'disable' ? { thinking: { type: 'disabled' as const } } : {}),
    ...(tuning.effort ? { output_config: { effort: tuning.effort } } : {}),
    ...(tuning.temperature !== null ? { temperature: tuning.temperature } : {}),
  });

  // Safety classifiers can decline with HTTP 200 + an empty content array.
  // Reading content[0] unconditionally would throw here.
  if (response.stop_reason === 'refusal') {
    throw new Error(`refused (${response.stop_details?.category ?? 'unspecified'})`);
  }

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();

  if (!text) throw new Error('empty completion');
  return { text, provider: 'anthropic', model };
}

// ── Google Gemini ──────────────────────────────────────────────────────────

async function callGemini(system: string, turns: ChatTurn[]): Promise<LlmResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const response = await fetch(url, {
    method: 'POST',
    // Key in a header, not the query string — query strings land in proxy and
    // access logs far more readily than headers do.
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    signal: AbortSignal.timeout(timeoutMs()),
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: turns.map((t) => ({
        // Gemini names the assistant role "model".
        role: t.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: t.content }],
      })),
      generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS, temperature: 0.4, topP: 0.8 },
    }),
  });

  const body = await response.text();
  if (!response.ok) throw new Error(`Gemini ${response.status}: ${body.substring(0, 120)}`);

  const data = JSON.parse(body);
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? '')
    .join('')
    .trim();

  if (!text) throw new Error('empty completion');
  return { text, provider: 'gemini', model };
}

// ── HuggingFace ────────────────────────────────────────────────────────────

async function callHuggingFace(system: string, turns: ChatTurn[]): Promise<LlmResult> {
  const token = process.env.HUGGINGFACE_API_KEY;
  if (!token) throw new Error('HUGGINGFACE_API_KEY not configured');

  const model = process.env.HF_MODEL || 'meta-llama/Meta-Llama-3-8B-Instruct';

  const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(timeoutMs()),
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: system }, ...turns],
      // Was 90 with stop: ['\n\n'] — that truncated replies mid-sentence
      // before any formatting ran. Brevity is enforced by the system prompt.
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0.4,
      top_p: 0.7,
      stream: false,
    }),
  });

  const body = await response.text();
  if (!response.ok) throw new Error(`HuggingFace ${response.status}: ${body.substring(0, 120)}`);

  const data = JSON.parse(body);
  const text = String(data.choices?.[0]?.message?.content ?? '').trim();
  if (!text) throw new Error('empty completion');
  return { text, provider: 'huggingface', model };
}

const PROVIDERS: Record<ProviderName, (system: string, turns: ChatTurn[]) => Promise<LlmResult>> = {
  anthropic: callAnthropic,
  gemini: callGemini,
  huggingface: callHuggingFace,
};

export class AllProvidersFailedError extends Error {
  attempts: ProviderAttempt[];
  constructor(attempts: ProviderAttempt[]) {
    super(`all providers failed: ${attempts.map((a) => `${a.provider} (${a.error})`).join('; ')}`);
    this.name = 'AllProvidersFailedError';
    this.attempts = attempts;
  }
}

/**
 * Try each provider in chain order, returning the first success.
 *
 * @param onAttemptFailure invoked per failed provider so the caller can log
 *   with its requestId. Provider errors are NEVER surfaced to the client.
 */
export async function runChain(
  system: string,
  turns: ChatTurn[],
  onAttemptFailure?: (attempt: ProviderAttempt) => void,
  registry: Partial<Record<ProviderName, (s: string, t: ChatTurn[]) => Promise<LlmResult>>> = PROVIDERS,
): Promise<LlmResult> {
  const attempts: ProviderAttempt[] = [];

  for (const name of resolveChain()) {
    const call = registry[name];
    if (!call) continue;
    try {
      return await call(system, turns);
    } catch (err) {
      const attempt = { provider: name, error: err instanceof Error ? err.message : String(err) };
      attempts.push(attempt);
      onAttemptFailure?.(attempt);
    }
  }

  throw new AllProvidersFailedError(attempts);
}
