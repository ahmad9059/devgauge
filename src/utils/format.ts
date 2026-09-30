// Pure formatting helpers. They take `now` explicitly so output is testable
// and never depends on a hidden clock.

const MINUTE = 60_000;

export function formatCount(
  value: number,
  unit: 'percent' | 'requests' | 'credits' | 'tokens' | 'currency',
): string {
  switch (unit) {
    case 'percent':
      // Preserve small, real usage (e.g. a weekly quota at 99.99% remaining).
      return `${value > 0 && value < 0.1 ? value.toFixed(2) : trim(value)}%`;
    case 'currency':
      return `$${trim(value)}`;
    case 'tokens':
      return `${trim(value)} tokens`;
    case 'credits':
      return `${trim(value)} credits`;
    case 'requests':
      return `${trim(value)} requests`;
  }
}

export function trim(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** Compact countdown such as `4d 2h`, `2h 05m`, `42m`, or `1m`. */
export function formatCountdown(minutes: number | undefined): string | null {
  if (minutes === undefined || !Number.isFinite(minutes) || minutes < 0)
    return null;
  const total = Math.round(minutes);
  if (total < 1) return 'under a minute';
  if (total < 60) return `${total}m`;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours < 24) {
    return mins === 0
      ? `${hours}h`
      : `${hours}h ${String(mins).padStart(2, '0')}m`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours === 0 ? `${days}d` : `${days}d ${remHours}h`;
}

/** Relative freshness such as `just now`, `12m ago`, `3h ago`, `2d ago`. */
export function formatRelativeMinutes(
  minutes: number | undefined,
): string | null {
  if (minutes === undefined || !Number.isFinite(minutes) || minutes < 0)
    return null;
  if (minutes < 1) return 'just now';
  const label = formatCountdown(minutes);
  return label ? `${label} ago` : null;
}

/** Reset time as a wall clock label from an explicit reference instant. */
export function formatClockTime(
  now: Date,
  inMinutes: number | undefined,
): string | null {
  if (inMinutes === undefined || !Number.isFinite(inMinutes)) return null;
  const target = new Date(now.getTime() + inMinutes * MINUTE);
  const hours = target.getHours();
  const mins = target.getMinutes();
  const suffix = hours < 12 ? 'AM' : 'PM';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}:${String(mins).padStart(2, '0')} ${suffix}`;
}

/** Clamp a utilization percentage for progress rendering. */
export function clampPercent(percent: number | undefined): number {
  if (percent === undefined || !Number.isFinite(percent)) return 0;
  return Math.max(0, Math.min(100, percent));
}
