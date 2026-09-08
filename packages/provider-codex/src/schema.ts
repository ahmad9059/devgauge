import { z } from "zod";

export const deviceCodeLoginResultSchema = z.object({
  type: z.literal("chatgptDeviceCode"),
  loginId: z.string().min(1),
  verificationUrl: z.url(),
  userCode: z.string().min(1),
});

export const loginStatusSchema = z.object({
  loginId: z.string().min(1),
  success: z.boolean(),
  error: z.string().nullable().optional(),
});

export const accountUpdatedSchema = z.object({
  authMode: z.string(),
  planType: z.string().nullable().optional(),
});

export const creditsSchema = z.object({
  hasCredits: z.boolean(),
  unlimited: z.boolean(),
  balance: z.string().nullable(),
});

export const rateLimitWindowSchema = z.object({
  usedPercent: z.number(),
  windowDurationMins: z.number().positive().nullable(),
  resetsAt: z.number().nonnegative().nullable(),
});

export const rateLimitBucketSchema = z.object({
  limitId: z.string().nullable(),
  limitName: z.string().nullable(),
  primary: rateLimitWindowSchema.nullable(),
  secondary: rateLimitWindowSchema.nullable(),
  credits: creditsSchema.nullable().optional(),
  individualLimit: z.unknown().nullable().optional(),
  spendControlReached: z.boolean().nullable().optional(),
  planType: z.string().nullable(),
  rateLimitReachedType: z.string().nullable(),
});

export const resetCreditSchema = z.object({
  id: z.string().min(1),
  resetType: z.enum(["codexRateLimits", "unknown"]),
  status: z.enum(["available", "redeeming", "redeemed", "unknown"]),
  grantedAt: z.number().nonnegative(),
  expiresAt: z.number().nonnegative().nullable(),
  title: z.string().nullable(),
  description: z.string().nullable(),
});

export const resetCreditsSummarySchema = z.object({
  availableCount: z.number().int().nonnegative(),
  credits: z.array(resetCreditSchema).nullable(),
});

export const rateLimitsReadResultSchema = z.object({
  rateLimits: rateLimitBucketSchema,
  rateLimitsByLimitId: z.record(z.string(), rateLimitBucketSchema).nullable(),
  rateLimitResetCredits: resetCreditsSummarySchema.nullable(),
  accountId: z.string().nullable().optional(),
  rateLimitUpsell: z.unknown().nullable().optional(),
});

export const rateLimitsUpdatedNotificationSchema = z.object({
  rateLimits: rateLimitBucketSchema,
});

export const usageSummarySchema = z.object({
  lifetimeTokens: z.number().int().nonnegative().nullable(),
  peakDailyTokens: z.number().int().nonnegative().nullable(),
  longestRunningTurnSec: z.number().int().nonnegative().nullable(),
  currentStreakDays: z.number().int().nonnegative().nullable(),
  longestStreakDays: z.number().int().nonnegative().nullable(),
});

export const dailyUsageBucketSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tokens: z.number().int().nonnegative(),
});

export const usageReadResultSchema = z.object({
  summary: usageSummarySchema.nullable(),
  dailyUsageBuckets: z.array(dailyUsageBucketSchema).nullable(),
});

export const consumeResetCreditResultSchema = z.object({
  outcome: z.enum(["reset", "alreadyRedeemed", "nothingToReset", "noCredit"]),
});

export type DeviceCodeLoginResult = z.infer<typeof deviceCodeLoginResultSchema>;
export type RateLimitsResult = z.infer<typeof rateLimitsReadResultSchema>;
export type UsageResult = z.infer<typeof usageReadResultSchema>;
export type ConsumeCreditOutcome = z.infer<typeof consumeResetCreditResultSchema>["outcome"];
