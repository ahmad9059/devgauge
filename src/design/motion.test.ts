import { describe, expect, it } from 'vitest';

import { durations, motion, resolveTransition } from './motion';

describe('motion tokens', () => {
  it('provides short, ordered durations', () => {
    expect(durations.fast).toBeLessThan(durations.base);
    expect(durations.base).toBeLessThan(durations.slow);
    expect(durations.instant).toBe(0);
    expect(durations.slow).toBeLessThanOrEqual(300);
  });

  it('renders the final state immediately when reduced motion is on', () => {
    for (const token of Object.values(motion)) {
      const transition = resolveTransition(token, true);
      expect(transition.duration).toBe(0);
      expect(transition.animated).toBe(false);
    }
  });

  it('keeps transitions when reduced motion is off', () => {
    expect(resolveTransition('base', false)).toEqual({
      duration: durations.base,
      animated: true,
    });
  });
});
