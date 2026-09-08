import type { HistoryEvent, HistoryPoint, HistoryResolution, HistorySeriesResponse, ProviderId } from "@devgauge/contracts";
import { listHistoryPoints, type Db, type HistoryCursorValue } from "@devgauge/database";

const encodeCursor = (point: HistoryPoint): string =>
  Buffer.from(JSON.stringify({ at: point.timestamp, id: point.snapshotId }), "utf8").toString("base64url");

export const decodeHistoryCursor = (value: string): HistoryCursorValue => {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as { at?: unknown; id?: unknown };
    const at = typeof parsed.at === "string" ? new Date(parsed.at) : new Date(Number.NaN);
    if (!Number.isFinite(at.getTime()) || typeof parsed.id !== "string" || !/^[0-9a-f-]{36}$/i.test(parsed.id)) {
      throw new Error("invalid cursor");
    }
    return { at, id: parsed.id };
  } catch {
    throw new TypeError("Invalid history cursor");
  }
};

export const deriveHistoryEvents = (points: HistoryPoint[]): HistoryEvent[] => {
  const ordered = [...points].reverse();
  const events: HistoryEvent[] = [];
  for (let index = 0; index < ordered.length; index++) {
    const point = ordered[index]!;
    const previous = ordered[index - 1];
    if (point.stale) events.push({ type: "stale", at: point.timestamp, endAt: null, label: "Provider marked this sample stale" });
    if (!previous) continue;
    const gapMs = new Date(point.timestamp).getTime() - new Date(previous.timestamp).getTime();
    if (gapMs > 6 * 3_600_000) {
      events.push({ type: "gap", at: previous.timestamp, endAt: point.timestamp, label: "No confirmed samples in this interval" });
    }
    if (previous.resetsAt && point.resetsAt && previous.resetsAt !== point.resetsAt) {
      events.push({ type: "reset", at: point.timestamp, endAt: null, label: "Reset cycle changed" });
    }
  }
  return events;
};

export const historyInsight = (points: HistoryPoint[]): string => {
  const values = [...points].reverse().map((point) => point.usedPercent).filter((value): value is number => value !== null);
  if (values.length < 2) return "More confirmed samples are needed for a trend.";
  const change = values.at(-1)! - values[0]!;
  if (Math.abs(change) < 1) return "Usage remained stable across this range.";
  return `Usage ${change > 0 ? "increased" : "decreased"} by ${Math.abs(change).toFixed(0)} percentage points across this range.`;
};

export const getHistorySeries = async (
  db: Db,
  input: {
    userId: string;
    provider: ProviderId;
    windowId?: string;
    from: Date;
    to: Date;
    resolution: HistoryResolution;
    cursor?: string;
    limit: number;
    timezone: string;
  }
): Promise<HistorySeriesResponse> => {
  const cappedLimit = Math.min(Math.max(input.limit, 1), 200);
  const rows = await listHistoryPoints(db, {
    ...input,
    ...(input.cursor ? { before: decodeHistoryCursor(input.cursor) } : {}),
    limit: cappedLimit,
  });
  const hasMore = rows.length > cappedLimit;
  const points = rows.slice(0, cappedLimit);
  const retentionStartsAt = new Date(input.to.getTime());
  retentionStartsAt.setUTCMonth(retentionStartsAt.getUTCMonth() - 13);
  return {
    schemaVersion: 1,
    provider: input.provider,
    windowId: input.windowId ?? points[0]?.windowId ?? null,
    requestedResolution: input.resolution,
    effectiveResolution: input.resolution,
    timezone: input.timezone,
    from: input.from.toISOString(),
    to: input.to.toISOString(),
    retentionStartsAt: retentionStartsAt.toISOString(),
    points,
    events: deriveHistoryEvents(points),
    insight: historyInsight(points),
    nextCursor: hasMore && points.length > 0 ? encodeCursor(points.at(-1)!) : null,
    hasMore,
  };
};
