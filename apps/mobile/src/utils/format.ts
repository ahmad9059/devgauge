import type { UsageWindow } from "@devgauge/contracts";

export const formatPercent = (value: number | null | undefined): string =>
  value == null ? "—" : `${Math.round(value)}%`;

/** "in 3h 12m" countdown from now to the given ISO timestamp. */
export const formatCountdown = (iso: string | null | undefined, now: Date = new Date()): string => {
  if (!iso) return "—";
  const target = new Date(iso).getTime();
  const deltaMs = target - now.getTime();
  if (deltaMs <= 0) return "resetting";
  const totalMinutes = Math.floor(deltaMs / 60_000);
  if (totalMinutes < 1) return "in <1m";
  if (totalMinutes < 60) return `in ${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) return minutes > 0 ? `in ${hours}h ${minutes}m` : `in ${hours}h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `in ${days}d ${remHours}h` : `in ${days}d`;
};

/** "3m ago" for last-sync/fetched timestamps. */
export const formatAge = (iso: string | null | undefined, now: Date = new Date()): string => {
  if (!iso) return "—";
  const deltaMs = now.getTime() - new Date(iso).getTime();
  if (deltaMs <= 0) return "now";
  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export const formatAbsolute = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

export const formatNumber = (value: number | null | undefined): string =>
  value == null ? "—" : value.toLocaleString();

/**
 * The window that best answers "what is most constrained right now":
 * a limited/warning window beats others; otherwise the finite window with
 * the smallest remaining percentage.
 */
export const getMostActionableWindow = (windows: UsageWindow[]): UsageWindow | undefined => {
  if (windows.length === 0) return undefined;
  const priority = { limited: 0, warning: 1, normal: 2, unknown: 3 } as const;
  return [...windows].sort((a, b) => {
    const p = priority[a.state] - priority[b.state];
    if (p !== 0) return p;
    const ra = a.remainingPercent ?? Number.POSITIVE_INFINITY;
    const rb = b.remainingPercent ?? Number.POSITIVE_INFINITY;
    return ra - rb;
  })[0];
};