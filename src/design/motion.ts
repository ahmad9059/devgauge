// Motion tokens plus a reduced-motion helper. Kept framework-free for tests.

export const durations = {
  instant: 0,
  fast: 120,
  base: 180,
  slow: 240,
} as const;

export type DurationToken = keyof typeof durations;

export type TransitionSpec = {
  duration: number;
  /** True when the transition should be applied at all. */
  animated: boolean;
};

/**
 * Resolves a transition duration. When the platform reports reduced motion,
 * every non-instant transition collapses to 0 so the final state renders
 * immediately and no non-essential movement occurs.
 */
export function resolveTransition(
  token: DurationToken,
  reduceMotion: boolean,
): TransitionSpec {
  const duration = durations[token];
  if (reduceMotion) return { duration: 0, animated: false };
  return { duration, animated: duration > 0 };
}

export const motion = {
  fade: 'fast',
  press: 'fast',
  sheet: 'base',
  skeleton: 'slow',
} as const satisfies Record<string, DurationToken>;
