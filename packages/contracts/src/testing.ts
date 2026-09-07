/**
 * Deterministic clock and identifier helpers for tests and fixtures.
 * Production code should receive a Clock via dependency injection so that
 * countdown and freshness behaviour is testable with an injected clock.
 */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};

/** Returns a clock pinned to a fixed ISO timestamp. */
export const fixedClock = (iso: string): Clock => ({
  now: () => new Date(iso),
});

/** Returns an ISO-8601 UTC string for the given date. */
export const toIsoUtc = (date: Date): string => date.toISOString();

/** Monotonic counter for deterministic identifiers in fixtures. */
export const createCounterId = (): (() => string) => {
  let n = 0;
  return () => `id-${++n}`;
};

/** Random UUID. Uses Web Crypto where available; Metro/node-safe fallback otherwise. */
export const createId = (): string => {
  const cryptoLike = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoLike?.randomUUID) {
    return cryptoLike.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};