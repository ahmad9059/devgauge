import { describe, expect, it, vi } from 'vitest';
import { createCoalescedReload } from './coalesced-reload';

describe('dashboard reload coalescing', () => {
  it('merges a burst but reads again to include writes that arrived during the first load', async () => {
    let release!: () => void;
    const first = new Promise<void>((resolve) => {
      release = resolve;
    });
    const load = vi
      .fn()
      .mockReturnValueOnce(first)
      .mockResolvedValue(undefined);
    const reload = createCoalescedReload(load);
    const calls = [reload(), reload(), reload(), reload()];
    expect(load).toHaveBeenCalledTimes(1);
    release();
    await Promise.all(calls);
    expect(load).toHaveBeenCalledTimes(2);
    await reload();
    expect(load).toHaveBeenCalledTimes(3);
  });
  it('allows a later load after a failure', async () => {
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error('database'))
      .mockResolvedValue(undefined);
    const reload = createCoalescedReload(load);
    await expect(reload()).rejects.toThrow('database');
    await reload();
    expect(load).toHaveBeenCalledTimes(2);
  });
});
