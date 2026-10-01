import { afterEach, describe, expect, it, vi } from 'vitest';
import { startForegroundClock } from './foreground-clock';

afterEach(() => vi.useRealTimers());
describe('foreground display clock', () => {
  it('ticks without provider requests, suspends in background, resumes immediately and cleans up', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T00:00Z'));
    let onState = (_active: boolean) => {};
    const unsubscribe = vi.fn();
    const update = vi.fn();
    const dispose = startForegroundClock(update, {
      isActive: () => true,
      subscribe: (listener) => {
        onState = listener;
        return unsubscribe;
      },
    });
    expect(update).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(120_000);
    expect(update).toHaveBeenCalledTimes(3);
    onState(false);
    vi.advanceTimersByTime(600_000);
    expect(update).toHaveBeenCalledTimes(3);
    onState(true);
    expect(update).toHaveBeenLastCalledWith(new Date('2026-10-01T00:12Z'));
    dispose();
    vi.advanceTimersByTime(120_000);
    expect(update).toHaveBeenCalledTimes(4);
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
