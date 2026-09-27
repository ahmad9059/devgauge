import { describe, expect, it } from 'vitest';

import { createSortableId, isSortableId } from '@/storage/ids';

describe('sortable ids', () => {
  it('produces ids that increase with time', () => {
    const early = createSortableId(1_000, new Uint8Array(12).fill(1));
    const later = createSortableId(2_000, new Uint8Array(12).fill(1));
    expect(isSortableId(early)).toBe(true);
    expect(early < later).toBe(true);
  });

  it('rejects invalid time or insufficient randomness', () => {
    expect(() => createSortableId(-1, new Uint8Array(12))).toThrow();
    expect(() => createSortableId(1, new Uint8Array(4))).toThrow(/at least/);
  });
});
