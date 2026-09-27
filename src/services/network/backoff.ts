export type BackoffOptions = {
  baseMs?: number;
  maxMs?: number;
  /** Fraction of the base delay used as +/- jitter (0 disables jitter). */
  jitter?: number;
  random?: () => number;
};

export const DEFAULT_BACKOFF: Required<Omit<BackoffOptions, 'random'>> = {
  baseMs: 2000,
  maxMs: 300_000,
  jitter: 0.5,
};

/**
 * Exponential backoff with symmetric jitter for the given 1-based attempt.
 * Deterministic when `random` is injected.
 */
export function computeBackoff(
  attempt: number,
  options: BackoffOptions = {},
): number {
  const {
    baseMs = DEFAULT_BACKOFF.baseMs,
    maxMs = DEFAULT_BACKOFF.maxMs,
    jitter = DEFAULT_BACKOFF.jitter,
    random = Math.random,
  } = options;
  if (!Number.isInteger(attempt) || attempt < 1) {
    throw new Error('attempt must be an integer >= 1');
  }
  const exponential = Math.min(maxMs, baseMs * 2 ** (attempt - 1));
  const offset = (random() * 2 - 1) * exponential * jitter;
  return Math.max(0, Math.round(exponential + offset));
}

/**
 * Parses a `Retry-After` header exactly. Accepts delta-seconds or an HTTP-date;
 * an elapsed or unparseable value returns null.
 */
export function parseRetryAfter(
  value: string | null | undefined,
  now: Date,
): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    return new Date(now.getTime() + Number(trimmed) * 1000);
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime()) || date.getTime() <= now.getTime()) {
    return null;
  }
  return date;
}

export function isRetryableStatus(status: number): boolean {
  return status >= 500 && status <= 599;
}
