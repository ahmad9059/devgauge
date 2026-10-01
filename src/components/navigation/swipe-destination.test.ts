import { describe, expect, it } from 'vitest';

import { swipeDestination } from './swipe-destination';

describe('tab swipes', () => {
  it('advances right and returns left through the owner-requested order', () => {
    expect(swipeDestination('usage', 120, 10)).toBe('connectors');
    expect(swipeDestination('connectors', 120, 10)).toBe('settings');
    expect(swipeDestination('settings', -120, 10)).toBe('connectors');
    expect(swipeDestination('connectors', -120, 10)).toBe('usage');
  });

  it('keeps the first and last tabs at their boundaries', () => {
    expect(swipeDestination('usage', -120, 0)).toBeNull();
    expect(swipeDestination('settings', 120, 0)).toBeNull();
    expect(swipeDestination('unknown', 120, 0)).toBeNull();
  });

  it('ignores short drags, vertical scrolling and diagonal movements', () => {
    expect(swipeDestination('usage', 30, 0)).toBeNull();
    expect(swipeDestination('usage', 80, 200)).toBeNull();
    expect(swipeDestination('usage', 80, 60)).toBeNull();
  });
});
