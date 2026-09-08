import { z } from "zod";

import { providerIdSchema } from "./provider.js";
import { sourceSchema, usageStateSchema, usageWindowUnitSchema } from "./usage.js";

export const historyResolutionSchema = z.enum(["raw", "daily"]);

export const historyPointSchema = z.object({
  snapshotId: z.string().uuid(),
  provider: providerIdSchema,
  windowId: z.string(),
  label: z.string(),
  timestamp: z.string().datetime({ offset: true }),
  usedPercent: z.number().min(0).max(100).nullable(),
  remainingPercent: z.number().min(0).max(100).nullable(),
  used: z.number().nullable(),
  limit: z.number().nullable(),
  unit: usageWindowUnitSchema.nullable(),
  resetsAt: z.string().datetime({ offset: true }).nullable(),
  state: usageStateSchema,
  stale: z.boolean(),
  source: sourceSchema,
});

export const historyEventSchema = z.object({
  type: z.enum(["reset", "gap", "stale"]),
  at: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }).nullable(),
  label: z.string(),
});

export const historySeriesResponseSchema = z.object({
  schemaVersion: z.literal(1),
  provider: providerIdSchema,
  windowId: z.string().nullable(),
  requestedResolution: historyResolutionSchema,
  effectiveResolution: historyResolutionSchema,
  timezone: z.string(),
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
  retentionStartsAt: z.string().datetime({ offset: true }),
  points: z.array(historyPointSchema),
  events: z.array(historyEventSchema),
  insight: z.string(),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export type HistoryResolution = z.infer<typeof historyResolutionSchema>;
export type HistoryPoint = z.infer<typeof historyPointSchema>;
export type HistoryEvent = z.infer<typeof historyEventSchema>;
export type HistorySeriesResponse = z.infer<typeof historySeriesResponseSchema>;
