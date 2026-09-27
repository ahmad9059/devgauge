import type { RefreshTrigger } from '@/storage/types';

export type AppLifecycleState =
  'active' | 'background' | 'inactive' | 'unknown';

/**
 * Maps an app lifecycle transition to a refresh trigger. Only entering the
 * foreground from a non-active state triggers a refresh; there is no continuous
 * background polling in v1.
 */
export function foregroundTrigger(
  previous: AppLifecycleState,
  next: AppLifecycleState,
): RefreshTrigger | null {
  if (previous !== 'active' && next === 'active') return 'foreground';
  return null;
}

/** True when the last success is missing or older than the connector TTL. */
export function isStale(
  lastSuccessAt: string | null,
  now: Date,
  ttlSeconds: number,
): boolean {
  if (!lastSuccessAt) return true;
  const parsed = Date.parse(lastSuccessAt);
  if (!Number.isFinite(parsed)) return true;
  return now.getTime() - parsed > ttlSeconds * 1000;
}

/**
 * Network awareness is request-failure driven rather than depending on a
 * separate reachability package: a transport failure produces `offline` and the
 * engine applies backoff (Phase 5 open question resolved this way).
 */
export const NETWORK_AWARENESS = 'request-failure-driven' as const;
