/**
 * llmStream.test.js — the streaming fallback chain.
 *
 * The rule that separates this from runChain: a provider may be swapped out
 * only while it has produced NOTHING. Once bytes are on the wire the client is
 * already showing that provider's words, and restarting the answer underneath
 * the reader is worse than a truncated one — so StreamInterruptedError
 * propagates instead of falling through.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  runChainStream,
  StreamInterruptedError,
  AllProvidersFailedError,
  parseSseBuffer,
} from '../../api/_lib/llm';

const ok = (provider, text) => async (_s, _t, onDelta) => {
  for (const piece of text.split(' ')) {
    if (onDelta(`${piece} `) === true) break;
  }
  return { text, provider, model: `${provider}-model` };
};
const fails = (msg) => async () => {
  throw new Error(msg);
};

describe('parseSseBuffer', () => {
  it('extracts complete data payloads', () => {
    const { payloads } = parseSseBuffer('data: {"a":1}\ndata: {"b":2}\n');
    expect(payloads).toEqual(['{"a":1}', '{"b":2}']);
  });

  it('keeps a trailing partial line for the next read', () => {
    // Network chunks do not respect event boundaries; splitting naively would
    // corrupt whichever event straddles them.
    const { payloads, rest } = parseSseBuffer('data: {"a":1}\ndata: {"par');
    expect(payloads).toEqual(['{"a":1}']);
    expect(rest).toBe('data: {"par');
  });

  it('ignores comments, blank lines and the [DONE] sentinel', () => {
    const { payloads } = parseSseBuffer(': keep-alive\n\ndata: [DONE]\ndata: {"x":1}\n');
    expect(payloads).toEqual(['{"x":1}']);
  });

  it('returns nothing for an empty buffer', () => {
    expect(parseSseBuffer('')).toEqual({ payloads: [], rest: '' });
  });
});

describe('runChainStream', () => {
  it('streams deltas from the first working provider', async () => {
    const seen = [];
    const result = await runChainStream('sys', [], (d) => void seen.push(d), undefined, {
      anthropic: ok('anthropic', 'hello there'),
    });
    expect(seen.join('')).toBe('hello there ');
    expect(result.provider).toBe('anthropic');
  });

  it('falls through when a provider fails BEFORE emitting anything', async () => {
    const onFail = vi.fn();
    const result = await runChainStream('sys', [], () => {}, onFail, {
      anthropic: fails('no key'),
      gemini: ok('gemini', 'backup answer'),
    });
    expect(result.provider).toBe('gemini');
    expect(onFail).toHaveBeenCalledWith({ provider: 'anthropic', error: 'no key' });
  });

  it('does NOT fall through when a provider fails AFTER emitting', async () => {
    const gemini = vi.fn(ok('gemini', 'should not run'));
    const attempt = runChainStream('sys', [], () => {}, undefined, {
      anthropic: async (_s, _t, onDelta) => {
        onDelta('Half an ans');
        throw new StreamInterruptedError('anthropic', 'Half an ans', new Error('socket closed'));
      },
      gemini,
    });
    await expect(attempt).rejects.toThrow(StreamInterruptedError);
    expect(gemini).not.toHaveBeenCalled();
  });

  it('exposes the partial text on the interruption', async () => {
    const err = await runChainStream('sys', [], () => {}, undefined, {
      anthropic: async (_s, _t, onDelta) => {
        onDelta('Partial');
        throw new StreamInterruptedError('anthropic', 'Partial', new Error('boom'));
      },
    }).catch((e) => e);
    expect(err.partial).toBe('Partial');
    expect(err.provider).toBe('anthropic');
  });

  it('stops reading upstream when the sink returns true', async () => {
    const pieces = [];
    await runChainStream('sys', [], (d) => {
      pieces.push(d);
      return pieces.length === 2; // cap reached
    }, undefined, { anthropic: ok('anthropic', 'one two three four five') });
    expect(pieces).toHaveLength(2);
  });

  it('throws AllProvidersFailedError when every provider fails clean', async () => {
    const attempt = runChainStream('sys', [], () => {}, undefined, {
      anthropic: fails('no key'),
      gemini: fails('429'),
      huggingface: fails('down'),
    });
    await expect(attempt).rejects.toThrow(AllProvidersFailedError);
  });

  it('collects every attempt so the log names each failure', async () => {
    const err = await runChainStream('sys', [], () => {}, undefined, {
      anthropic: fails('no key'),
      gemini: fails('429'),
    }).catch((e) => e);
    expect(err.attempts.map((a) => a.provider)).toEqual(['anthropic', 'gemini']);
  });

  it('skips providers absent from the registry rather than failing', async () => {
    const result = await runChainStream('sys', [], () => {}, undefined, {
      huggingface: ok('huggingface', 'last resort'),
    });
    expect(result.provider).toBe('huggingface');
  });
});
