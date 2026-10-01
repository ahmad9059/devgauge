import { normalizeResetTime } from '@/domain/reset-time';

// Pure formatting helpers. They take `now` explicitly so output is testable
// and never depends on a hidden clock.

const MINUTE = 60_000;

/** Device-local wall time, with one readable format throughout the app. */
export function formatDateTime(value: string): string | null {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const day = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const time = date
    .toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .replace(/\s+(?=[AP]M$)/, '');
  return `${day} ${time}`;
}

/** Already-readable provider dates stay display-only when no offset is supplied. */
export function formatProviderResetText(value: string): string {
  return value.trim().replace(/\s+(?=[AP]M\b)/gi, '');
}

/** A website's offset-free wall clock can be used for display, never scheduling. */
function providerWallDate(text: string): Date | null {
  const instant = normalizeResetTime(text);
  if (instant) return new Date(instant);
  const match =
    /^(?:on\s+)?([a-z]+)\s+(\d{1,2}),?\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(
      text.trim(),
    );
  if (!match) return null;
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const month = months.findIndex((name) =>
    [name.toLowerCase(), name.slice(0, 3).toLowerCase()].includes(
      match[1].toLowerCase(),
    ),
  );
  const day = Number(match[2]),
    year = Number(match[3]),
    hour = Number(match[4]),
    minute = Number(match[5]);
  if (month < 0 || hour < 1 || hour > 12 || minute > 59) return null;
  const localHour = (hour % 12) + (match[6].toUpperCase() === 'PM' ? 12 : 0);
  const date = new Date(year, month, day, localHour, minute);
  return date.getFullYear() === year &&
    date.getMonth() === month &&
    date.getDate() === day &&
    date.getHours() === localHour
    ? date
    : null;
}

export function formatUsageReset(
  window: {
    kind: string;
    resetsAt?: string;
    resetsText?: string;
    resetsInMinutes?: number;
    resetDue?: boolean;
  },
  now = new Date(),
): string | undefined {
  const date = window.resetsAt
    ? new Date(window.resetsAt)
    : window.resetsText
      ? providerWallDate(window.resetsText)
      : null;
  const hasDate = date !== null && Number.isFinite(date.getTime());
  if (['monthly', 'billing-period', 'billing'].includes(window.kind)) {
    const label = hasDate
      ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : window.resetsText?.replace(/^on\s+/i, '').trim();
    return label
      ? `Resets on ${formatProviderResetText(label)}${window.resetDue ? ' · awaiting fresh usage' : ''}`
      : undefined;
  }
  const minutes =
    window.resetsInMinutes ??
    (hasDate
      ? Math.max(0, Math.round((date.getTime() - now.getTime()) / MINUTE))
      : undefined);
  if (window.resetDue || (hasDate && date.getTime() <= now.getTime()))
    return 'Reset due · awaiting fresh usage';
  if (minutes !== undefined) {
    const countdown = formatCountdown(minutes);
    return countdown ? `Resets in ${countdown}` : undefined;
  }
  return window.resetsText
    ? `Resets ${formatProviderResetText(window.resetsText)}`
    : undefined;
}

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
