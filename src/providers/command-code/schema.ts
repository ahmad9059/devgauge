import { z } from 'zod';

// Candidate schema. It is only ever applied to a response fetched through a
// verified vendor contract; until then the connector makes no request.
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
  resetsAt: z.string().max(40).optional(),
});

export const commandCodeUsageSchema = z.object({
  fetchedAt: z.string().max(40).optional(),
  partial: z.boolean().optional(),
  windows: z.array(windowSchema).max(50),
});

export type CommandCodeUsage = z.infer<typeof commandCodeUsageSchema>;
