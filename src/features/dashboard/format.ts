import type { UsageUnit } from '@/domain/usage';
import { formatRelativeMinutes, trim } from '@/utils/format';

const UNIT_SUFFIX: Record<UsageUnit, string> = {
  percent: '%',
  requests: ' requests',
  credits: ' credits',
  tokens: ' tokens',
  currency: '',
};

/** Formats a stored decimal string without converting it to a float. */
export function formatDecimalValue(
  value: string | null,
  unit: UsageUnit,
): string {
  if (value === null) return '—';
  if (unit === 'currency') return `$${value}`;
  return `${value}${UNIT_SUFFIX[unit]}`;
}

/** An absent cap is unknown, never zero or "unlimited". */
export function formatLimit(limit: string | null, unit: UsageUnit): string {
  if (limit === null) return unit === 'currency' ? 'no cap' : 'unknown limit';
  return formatDecimalValue(limit, unit);
}

export function formatPercent(utilization: number | null): string {
  if (utilization === null) return '—';
  return `${trim(Math.round(utilization * 1000) / 10)}%`;
}

export function freshnessLabel(
  lastSuccessAt: string | null,
  now: Date,
): string {
  if (!lastSuccessAt) return 'Never synced';
  const parsed = Date.parse(lastSuccessAt);
  if (!Number.isFinite(parsed)) return 'Never synced';
  const minutes = Math.max(0, Math.round((now.getTime() - parsed) / 60_000));
  const relative = formatRelativeMinutes(minutes);
  return relative ? `Updated ${relative}` : 'Updated just now';
}
