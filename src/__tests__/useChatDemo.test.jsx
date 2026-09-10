/**
 * useChatDemo.test.jsx — demo playback must survive the panel closing.
 *
 * The cursor used to live in the ChatDemo component, which unmounts with the
 * panel while `useChat` (owned by Chatbot) persists. Close mid-demo, reopen:
 * a fresh cursor at 0 auto-played the whole script again into a transcript
 * that already held the first half. The hook owns playback now, so this is
 * tested at the hook: the panel's open state is just a prop that changes.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../services/chatService', () => ({ getChatResponse: vi.fn() }));
vi.mock('../services/analyticsService', () => ({
  analyticsService: { logInteraction: vi.fn(), sessionId: 'test-session' },
}));

import { useChat } from '../hooks/useChat';
import { getChatResponse } from '../services/chatService';
import { INITIAL_MESSAGE } from '../components/chat/chatConstants';
import demoMessages from '../data/chatDemo.json';

const script = demoMessages.map((m) => m.content);
/** Transcript minus the greeting. */
const landed = (result) => result.current.messages.slice(1).map((m) => m.content);
/** Advance one turn at a time — each landing re-arms the next timer in an effect. */
const playTurns = (n) => {
  for (let i = 0; i < n; i++) act(() => vi.advanceTimersByTime(1200));
};

const mount = (isOpen = true) =>
  renderHook(({ isOpen: open }) => useChat({ isOpen: open }), { initialProps: { isOpen } });

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('demo playback', () => {
  it('starts from the greeting and lands turns on their typing delays', () => {
    const { result } = mount();
    act(() => result.current.handleDemoToggle());
    expect(result.current.demoMode).toBe(true);
    expect(result.current.demoPlaying).toBe(true);
    expect(landed(result)).toEqual([]);

    act(() => vi.advanceTimersByTime(600)); // a user turn
    expect(landed(result)).toEqual(script.slice(0, 1));
    act(() => vi.advanceTimersByTime(1200)); // an assistant turn
    expect(landed(result)).toEqual(script.slice(0, 2));
  });

  it('keeps playing while the panel is closed and resumes in place — no replay, no duplicates', () => {
    const { result, rerender } = mount(true);
    act(() => result.current.handleDemoToggle());
    act(() => vi.advanceTimersByTime(600)); // turn 1 lands while open
    expect(result.current.unreadCount).toBe(0);

    rerender({ isOpen: false }); // closed mid-demo
    act(() => vi.advanceTimersByTime(1200)); // turn 2 lands while closed
    expect(landed(result)).toEqual(script.slice(0, 2));
    expect(result.current.unreadCount).toBe(1);

    rerender({ isOpen: true }); // reopened: nothing replays, unread clears
    expect(result.current.unreadCount).toBe(0);
    expect(landed(result)).toEqual(script.slice(0, 2));
    act(() => vi.advanceTimersByTime(600)); // turn 3 continues the sequence
    expect(landed(result)).toEqual(script.slice(0, 3));

    playTurns(script.length);
    expect(landed(result)).toEqual(script); // every turn exactly once, in order
    expect(result.current.demoPlaying).toBe(false);
    expect(result.current.demoComplete).toBe(true);
  });

  it('replays from the greeting with fresh message ids', () => {
    const { result } = mount();
    act(() => result.current.handleDemoToggle());
    playTurns(script.length);
    const firstIds = result.current.messages.slice(1).map((m) => m.id);
    expect(firstIds.every(Boolean)).toBe(true);

    act(() => result.current.handleDemoReset());
    expect(landed(result)).toEqual([]);
    expect(result.current.demoComplete).toBe(false);
    playTurns(script.length);
    expect(landed(result)).toEqual(script);
    const secondIds = result.current.messages.slice(1).map((m) => m.id);
    expect(secondIds.some((id) => firstIds.includes(id))).toBe(false);
  });

  it('leaving demo mode stops playback AND clears the canned turns', () => {
    const { result } = mount();
    act(() => result.current.handleDemoToggle());
    act(() => vi.advanceTimersByTime(600));
    act(() => result.current.handleDemoToggle()); // off

    expect(result.current.demoMode).toBe(false);
    expect(result.current.demoPlaying).toBe(false);
    playTurns(script.length);
    expect(landed(result)).toEqual([]); // nothing more landed, nothing left behind
  });

  it('does not leave canned turns in the history sent to the model', () => {
    // Leaving demo mode used to reset only the cursor. The scripted turns
    // stayed in `messages`, so the next real question shipped them as context:
    // the model was told it had already said things it never said, and the
    // header counted the scripted questions as the visitor's own.
    const { result } = mount();
    act(() => result.current.handleDemoToggle());
    playTurns(3);
    expect(landed(result).length).toBeGreaterThan(0);

    act(() => result.current.handleDemoToggle()); // back to real chat
    expect(result.current.messages).toEqual([INITIAL_MESSAGE]);
    expect(result.current.stats.userQuestions).toBe(0);
  });

  it('counts only replies as unread, not the scripted questions', () => {
    // The script alternates question and answer, so counting every landed turn
    // made a 4-answer conversation show a badge of 8 — half of it the
    // visitor's own simulated typing.
    const { result, rerender } = mount(true);
    act(() => result.current.handleDemoToggle());
    rerender({ isOpen: false });
    playTurns(script.length + 2);

    const replies = demoMessages.filter((m) => m.role === 'assistant').length;
    expect(landed(result)).toEqual(script);
    expect(result.current.unreadCount).toBe(replies);
  });

  it('refuses to start or stop the demo while a reply is still landing', () => {
    // Same reason clearHistory is guarded: this replaces the transcript, and
    // onDelta recreates the streaming bubble from `prev` whenever it is
    // missing — so clearing mid-stream did not cancel the reply, it re-seeded
    // it and then wrote the finished answer into the middle of the demo.
    let release;
    getChatResponse.mockImplementation(async (_h, opts) => {
      opts.onDelta('Str');
      await new Promise((r) => { release = r; });
      return 'Streamed answer.';
    });
    const { result } = mount();
    act(() => { result.current.processMessage('a real question'); });
    expect(result.current.isBusy).toBe(true);

    act(() => result.current.handleDemoToggle());
    expect(result.current.demoMode).toBe(false);
    expect(result.current.messages.some((m) => m.content === 'a real question')).toBe(true);

    act(() => { release(); });
    return vi.waitFor(() => expect(result.current.isBusy).toBe(false));
  });
});
