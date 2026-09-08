import { z } from "zod";

/**
 * The strict, allowlisted schema for the minimized companion snapshot. Only
 * these fields may ever leave the desktop. Everything else in the raw
 * statusLine input is discarded.
 */
export const rateLimitWindowSchema = z.object({
  used_percentage: z.number(),
  resets_at: z.number().int(),
});

export const minimizedSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  deviceId: z.string().min(1),
  claudeCodeVersion: z.string().optional(),
  capturedAt: z.string().datetime({ offset: true }),
  localSequence: z.number().int().nonnegative(),
  rateLimits: z
    .object({
      five_hour: rateLimitWindowSchema.optional(),
      seven_day: rateLimitWindowSchema.optional(),
      spend_limit: rateLimitWindowSchema.optional(),
    })
    .optional(),
});

export type MinimizedSnapshot = z.infer<typeof minimizedSnapshotSchema>;

/**
 * Human labels for recognized rate-limit windows. Unknown windows are dropped
 * (they are outside the allowlist) rather than forwarded.
 */
export const RATE_LIMIT_LABELS: Record<string, string> = {
  five_hour: "5 hour",
  seven_day: "7 day",
  spend_limit: "Spend limit",
};