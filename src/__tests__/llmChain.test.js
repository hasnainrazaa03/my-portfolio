/**
 * llmChain.test.js — provider chain resolution, per-model request tuning, and
 * fallback behaviour.
 *
 * The chain is the availability story for the chatbot: if Anthropic is down or
 * out of quota, Gemini's free tier must pick it up, and only when everything
 * fails should the client drop to canned responses.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveChain, tuningFor, runChain, AllProvidersFailedError } from '../../api/_lib/llm';

afterEach(() => {
  delete process.env.LLM_CHAIN;
});

describe('resolveChain', () => {
  it('defaults to anthropic → gemini → huggingface', () => {
    expect(resolveChain(undefined)).toEqual(['anthropic', 'gemini', 'huggingface']);
  });

  it('honours an explicit order', () => {
    expect(resolveChain('gemini,anthropic')).toEqual(['gemini', 'anthropic']);
  });

  it('is whitespace and case tolerant', () => {
    expect(resolveChain(' Gemini , ANTHROPIC ')).toEqual(['gemini', 'anthropic']);
  });

  it('de-duplicates', () => {
    expect(resolveChain('gemini,gemini,anthropic')).toEqual(['gemini', 'anthropic']);
  });

  it('drops unknown names rather than throwing', () => {
    expect(resolveChain('openai,gemini')).toEqual(['gemini']);
  });

  it('falls back to the default when nothing valid remains', () => {
    expect(resolveChain('nonsense')).toEqual(['anthropic', 'gemini', 'huggingface']);
  });
});

describe('tuningFor', () => {
  it('disables thinking on models that run it by default', () => {
    // Sonnet 5 / Opus 5 / 4.8 / 4.7 think by default — pure latency and cost
    // for a two-sentence persona reply.
    for (const m of ['claude-sonnet-5', 'claude-opus-5', 'claude-opus-4-8', 'claude-opus-4-7']) {
      expect(tuningFor(m).thinking).toBe('disable');
    }
  });

  it('never sends temperature to models that reject it', () => {
    for (const m of ['claude-sonnet-5', 'claude-opus-5', 'claude-fable-5']) {
      expect(tuningFor(m).temperature).toBeNull();
    }
  });

  it('omits (never disables) thinking on Fable/Mythos, which 400 on disabled', () => {
    expect(tuningFor('claude-fable-5').thinking).toBe('omit');
    expect(tuningFor('claude-mythos-5').thinking).toBe('omit');
  });

  it('omits effort on Haiku 4.5, where the parameter errors', () => {
    expect(tuningFor('claude-haiku-4-5').effort).toBeNull();
    expect(tuningFor('claude-haiku-4-5').thinking).toBe('omit');
  });

  it('falls back to the safest shape for an unrecognised model', () => {
    expect(tuningFor('some-future-model')).toEqual({
      thinking: 'omit',
      effort: null,
      temperature: 0.4,
    });
  });
});

describe('runChain', () => {
  const ok = (provider) =>
    vi.fn().mockResolvedValue({ text: 'hi', provider, model: `${provider}-model` });
  const fail = (msg) => vi.fn().mockRejectedValue(new Error(msg));

  it('returns the first provider that succeeds', async () => {
    process.env.LLM_CHAIN = 'anthropic,gemini';
    const gemini = ok('gemini');
    const result = await runChain('sys', [{ role: 'user', content: 'q' }], undefined, {
      anthropic: ok('anthropic'),
      gemini,
    });
    expect(result.provider).toBe('anthropic');
    expect(gemini).not.toHaveBeenCalled();
  });

  it('falls through to the next provider on failure', async () => {
    process.env.LLM_CHAIN = 'anthropic,gemini';
    const result = await runChain('sys', [{ role: 'user', content: 'q' }], undefined, {
      anthropic: fail('no key'),
      gemini: ok('gemini'),
    });
    expect(result.provider).toBe('gemini');
  });

  it('reports each failure so the caller can log with a requestId', async () => {
    process.env.LLM_CHAIN = 'anthropic,gemini';
    const onFail = vi.fn();
    await runChain('sys', [{ role: 'user', content: 'q' }], onFail, {
      anthropic: fail('rate limited'),
      gemini: ok('gemini'),
    });
    expect(onFail).toHaveBeenCalledWith({ provider: 'anthropic', error: 'rate limited' });
  });

  it('throws AllProvidersFailedError when every provider fails', async () => {
    process.env.LLM_CHAIN = 'anthropic,gemini';
    await expect(
      runChain('sys', [{ role: 'user', content: 'q' }], undefined, {
        anthropic: fail('down'),
        gemini: fail('quota'),
      }),
    ).rejects.toThrow(AllProvidersFailedError);
  });

  it('skips providers absent from the registry instead of crashing', async () => {
    process.env.LLM_CHAIN = 'anthropic,gemini';
    const result = await runChain('sys', [{ role: 'user', content: 'q' }], undefined, {
      gemini: ok('gemini'),
    });
    expect(result.provider).toBe('gemini');
  });
});
