import { describe, expect, it, vi } from 'vitest';
import { retrySync } from './sync-retry';

describe('silent sync retries', () => {
  it('recovers from transient failures with three bounded backoff retries', async () => {
    const attempt = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce('retry')
      .mockResolvedValueOnce('retry')
      .mockResolvedValueOnce('success');
    const wait = vi.fn().mockResolvedValue(undefined);
    expect(await retrySync(attempt, wait)).toBe(true);
    expect(attempt).toHaveBeenCalledTimes(4);
    expect(wait.mock.calls.map(([delay]) => delay)).toEqual([500, 1000, 2000]);
  });
  it('stops after exhausted retries and does not retry sign-in failures', async () => {
    const attempt = vi.fn().mockResolvedValue('retry');
    expect(await retrySync(attempt, async () => {})).toBe(false);
    expect(attempt).toHaveBeenCalledTimes(4);
    const auth = vi.fn().mockResolvedValue('stop');
    expect(await retrySync(auth)).toBe(false);
    expect(auth).toHaveBeenCalledTimes(1);
  });
});
