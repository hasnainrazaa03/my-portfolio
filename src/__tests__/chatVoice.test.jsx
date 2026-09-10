/**
 * chatVoice.test.jsx — the chat must not talk to a closed panel.
 *
 * Text-to-speech reads each new assistant reply aloud when the visitor turns
 * it on. That was safe while demo playback lived inside the panel and died
 * with it. Playback now lives in useChat and keeps running after the panel
 * closes, so without a guard the page fell silent on close (the cancel effect)
 * and then started talking again at the next canned reply — a voice with no
 * visible source.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const speak = vi.fn();
const cancel = vi.fn();
vi.mock('../hooks/useSpeechSynthesis', () => ({
  useSpeechSynthesis: () => ({ supported: true, speaking: false, speak, cancel }),
}));
vi.mock('../hooks/useSpeechRecognition', () => ({
  useSpeechRecognition: () => ({ supported: false, listening: false, error: null, start: vi.fn(), stop: vi.fn() }),
}));

import { useChatVoice } from '../hooks/useChatVoice';

const greeting = { role: 'assistant', content: 'Hi there.' };
const reply = (content, id) => ({ id, role: 'assistant', content });

const mount = (messages, isOpen = true) =>
  renderHook(
    ({ messages: m, isOpen: o }) =>
      useChatVoice({ messages: m, isOpen: o, isBusy: false, processMessage: vi.fn(), setInput: vi.fn() }),
    { initialProps: { messages, isOpen } },
  );

beforeEach(() => vi.clearAllMocks());

describe('text-to-speech', () => {
  it('reads a new reply aloud while the panel is open', () => {
    const { result, rerender } = mount([greeting]);
    act(() => result.current.toggleTts());
    rerender({ messages: [greeting, reply('First answer.', 'a')], isOpen: true });
    expect(speak).toHaveBeenCalledWith('First answer.');
  });

  it('stays silent for replies that land while the panel is closed', () => {
    const { result, rerender } = mount([greeting], true);
    act(() => result.current.toggleTts());
    rerender({ messages: [greeting, reply('Heard this.', 'a')], isOpen: true });
    expect(speak).toHaveBeenCalledTimes(1);

    // Panel closed; demo playback carries on landing canned replies.
    rerender({ messages: [greeting, reply('Heard this.', 'a'), reply('Not this.', 'b')], isOpen: false });
    rerender({
      messages: [greeting, reply('Heard this.', 'a'), reply('Not this.', 'b'), reply('Nor this.', 'c')],
      isOpen: false,
    });
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak).not.toHaveBeenCalledWith('Not this.');
  });

  it('cancels anything mid-sentence when the panel closes', () => {
    const { rerender } = mount([greeting], true);
    rerender({ messages: [greeting], isOpen: false });
    expect(cancel).toHaveBeenCalled();
  });

  it('says nothing at all until the visitor turns it on', () => {
    const { rerender } = mount([greeting]);
    rerender({ messages: [greeting, reply('Unrequested.', 'a')], isOpen: true });
    expect(speak).not.toHaveBeenCalled();
  });

  it('never reads the greeting aloud when toggled on', () => {
    const { result } = mount([greeting]);
    act(() => result.current.toggleTts());
    expect(speak).not.toHaveBeenCalled();
  });
});
