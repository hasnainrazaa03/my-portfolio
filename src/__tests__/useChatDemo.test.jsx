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

  it('leaving demo mode stops playback where it is', () => {
    const { result } = mount();
    act(() => result.current.handleDemoToggle());
    act(() => vi.advanceTimersByTime(600));
    act(() => result.current.handleDemoToggle()); // off
    expect(result.current.demoMode).toBe(false);
    playTurns(script.length);
    expect(landed(result)).toEqual(script.slice(0, 1)); // nothing more landed
    expect(result.current.demoPlaying).toBe(false);
  });
});
