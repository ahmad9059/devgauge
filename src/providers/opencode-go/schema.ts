import { z } from 'zod';

// Candidate schema, isolated from Command Code so one vendor's schema change
// cannot break the other.
const decimalString = z
  .string()
  .max(60)
  .regex(/^\d+(\.\d+)?$/, 'expected a non-negative decimal string');

const windowSchema = z.object({
  key: z.string().min(1).max(120),
  kind: z.enum(['rolling', 'daily', 'weekly', 'monthly', 'billing']),
  label: z.string().min(1).max(200),
  unit: z.enum(['percent', 'requests', 'credits', 'tokens', 'currency']),
  used: decimalString.optional(),
  limit: decimalString.optional(),
  currencyCode: z.string().length(3).optional(),
  resetsAt: z.string().max(40).optional(),
});

export const openCodeGoUsageSchema = z.object({
  fetchedAt: z.string().max(40).optional(),
  partial: z.boolean().optional(),
  windows: z.array(windowSchema).max(50),
});

export type OpenCodeGoUsage = z.infer<typeof openCodeGoUsageSchema>;
