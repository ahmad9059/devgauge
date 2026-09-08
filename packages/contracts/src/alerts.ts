import { z } from "zod";

import { providerIdSchema } from "./provider.js";

export const ALERT_KINDS = [
  "consumed_threshold",
  "remaining_threshold",
  "provider_limited",
  "reset_observed",
  "data_stale",
  "reauthentication_required",
  "companion_offline",
] as const;

export const alertKindSchema = z.enum(ALERT_KINDS);
export const alertPreviewSchema = z.enum(["generic", "detailed"]);

export const quietHoursSchema = z.object({
  enabled: z.boolean(),
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  timezone: z.string().min(1),
});

export const alertRuleSchema = z.object({
  id: z.string().uuid(),
  provider: providerIdSchema.nullable(),
  windowId: z.string().nullable(),
  kind: alertKindSchema,
  threshold: z.number().min(0).max(100).nullable(),
  hysteresis: z.number().min(0).max(25),
  enabled: z.boolean(),
  critical: z.boolean(),
  preview: alertPreviewSchema,
  quietHours: quietHoursSchema.nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export const alertRuleInputSchema = z.object({
  provider: providerIdSchema.nullable().default(null),
  windowId: z.string().min(1).max(200).nullable().default(null),
  kind: alertKindSchema,
  threshold: z.number().min(0).max(100).nullable().default(null),
  hysteresis: z.number().min(0).max(25).default(5),
  enabled: z.boolean().default(true),
  critical: z.boolean().default(false),
  preview: alertPreviewSchema.default("generic"),
  quietHours: quietHoursSchema.nullable().default(null),
}).superRefine((value, ctx) => {
  if ((value.kind === "consumed_threshold" || value.kind === "remaining_threshold") && value.threshold === null) {
    ctx.addIssue({ code: "custom", path: ["threshold"], message: "Threshold is required for percentage alerts" });
  }
});

export const alertEventSchema = z.object({
  id: z.string().uuid(),
  ruleId: z.string().uuid().nullable(),
  provider: providerIdSchema.nullable(),
  windowId: z.string().nullable(),
  kind: alertKindSchema,
  severity: z.enum(["info", "warning", "critical"]),
  title: z.string(),
  body: z.string(),
  occurredAt: z.string().datetime({ offset: true }),
  deliverAfter: z.string().datetime({ offset: true }),
  acknowledgedAt: z.string().datetime({ offset: true }).nullable(),
});

export const alertsResponseSchema = z.object({ alerts: z.array(alertRuleSchema) });
export const alertEventsResponseSchema = z.object({ events: z.array(alertEventSchema) });

export type AlertKind = z.infer<typeof alertKindSchema>;
export type AlertRule = z.infer<typeof alertRuleSchema>;
export type AlertRuleInput = z.infer<typeof alertRuleInputSchema>;
export type AlertEvent = z.infer<typeof alertEventSchema>;
