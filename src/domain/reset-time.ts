/** Only explicit-offset ISO instants and elapsed durations are schedulable. */
export function normalizeResetTime(
  value: unknown,
  capturedAt?: Date,
): string | null {
  if (
    typeof value === 'number' ||
    (typeof value === 'string' && /^\d{10,13}$/.test(value))
  ) {
    const epoch = Number(value);
    const milliseconds = epoch < 100_000_000_000 ? epoch * 1000 : epoch;
    const date = new Date(milliseconds);
    return epoch >= 0 && Number.isFinite(date.getTime())
      ? date.toISOString()
      : null;
  }
  if (typeof value !== 'string') return null;
  const text = value.trim();
  const iso =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/i.exec(
      text,
    );
  if (iso) {
    const [, y, mo, d, h, mi, sec = '0', offset] = iso;
    const calendar = new Date(0);
    calendar.setUTCFullYear(Number(y), Number(mo) - 1, Number(d));
    calendar.setUTCHours(Number(h), Number(mi), Number(sec), 0);
    if (
      calendar.getUTCFullYear() !== Number(y) ||
      calendar.getUTCMonth() !== Number(mo) - 1 ||
      calendar.getUTCDate() !== Number(d) ||
      Number(h) > 23 ||
      Number(mi) > 59 ||
      Number(sec) > 59
    )
      return null;
    if (offset.toUpperCase() !== 'Z') {
      const [hours, minutes] = offset.slice(1).split(':').map(Number);
      if (hours > 14 || minutes > 59 || (hours === 14 && minutes !== 0))
        return null;
    }
    const date = new Date(text);
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  }
  if (
    !capturedAt ||
    !Number.isFinite(capturedAt.getTime()) ||
    !/^in\s+/i.test(text)
  )
    return null;
  const duration = text.replace(/^in\s+/i, '');
  const token =
    /(\d+(?:\.\d+)?)\s*(days?|d|hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)\b/gi;
  let milliseconds = 0;
  let end = 0;
  let count = 0;
  for (const match of duration.matchAll(token)) {
    if (duration.slice(end, match.index).trim()) return null;
    const unit = match[2].toLowerCase()[0];
    const multiplier = { d: 86400000, h: 3600000, m: 60000, s: 1000 }[unit]!;
    milliseconds += Number(match[1]) * multiplier;
    end = match.index + match[0].length;
    count++;
  }
  if (!count || duration.slice(end).trim()) return null;
  const date = new Date(capturedAt.getTime() + milliseconds);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}
