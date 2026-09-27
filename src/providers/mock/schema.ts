import { z } from 'zod';

const decimalString = z
  .string()
  .max(60)
  .regex(/^\d+(\.\d+)?$/, 'expected a non-negative decimal string');

export const rawUsageWindowSchema = z.object({
  key: z.string().min(1).max(120),
  kind: z.enum(['rolling', 'daily', 'weekly', 'monthly', 'billing']),
  label: z.string().min(1).max(200),
  unit: z.enum(['percent', 'requests', 'credits', 'tokens', 'currency']),
  used: decimalString.optional(),
  limit: decimalString.optional(),
  remaining: decimalString.optional(),
  currencyCode: z.string().length(3).optional(),
  periodStartsAt: z.string().max(40).optional(),
  periodEndsAt: z.string().max(40).optional(),
  resetsAt: z.string().max(40).optional(),
  derivation: z.enum(['provider', 'documented-rule', 'manual']).optional(),
});

export const rawUsageSchema = z.object({
  schemaVersion: z.number().int().min(1).max(1000),
  fetchedAt: z.string().max(40).optional(),
  partial: z.boolean().optional(),
  account: z
    .object({
      externalId: z.string().max(200).optional(),
      displayName: z.string().max(200).optional(),
      accountHint: z.string().max(200).optional(),
      scope: z.enum(['personal', 'organization', 'workspace']).optional(),
    })
    .optional(),
  windows: z.array(rawUsageWindowSchema).max(50),
  requestId: z.string().max(120).optional(),
});

export type RawUsage = z.infer<typeof rawUsageSchema>;
export type RawUsageWindow = z.infer<typeof rawUsageWindowSchema>;
