import { z } from "zod";

/**
 * Runtime validation for the OpenCode Go usage endpoint
 * (`GET https://opencode.ai/zen/go/v1/usage`). Each window is validated
 * independently and nullable so an absent/future field never erases valid
 * siblings.
 */
export const openCodeGoWindowSchema = z.object({
  status: z.enum(["ok", "rate-limited"]),
  percent: z.number(),
  resetsAt: z.string().datetime({ offset: true }),
});

export type OpenCodeGoWindow = z.infer<typeof openCodeGoWindowSchema>;

export const openCodeGoUsageSchema = z.object({
  usage: z.object({
    rolling: openCodeGoWindowSchema.nullable().optional(),
    weekly: openCodeGoWindowSchema.nullable().optional(),
    monthly: openCodeGoWindowSchema.nullable().optional(),
  }),
});

export type OpenCodeGoUsage = z.infer<typeof openCodeGoUsageSchema>;

export const openCodeGoErrorSchema = z.object({
  type: z.literal("error"),
  error: z.object({
    type: z.string(),
    message: z.string(),
  }),
});

export type OpenCodeGoError = z.infer<typeof openCodeGoErrorSchema>;