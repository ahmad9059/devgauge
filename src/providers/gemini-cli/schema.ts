import { z } from 'zod';

// User-shared Gemini CLI `/stats model` figures. This is NOT a live account
// quota API: coverage and capturedAt are required so the UI can label it.
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

export const geminiCliStatsSchema = z.object({
  cliVersion: z.string().max(40).optional(),
  capturedAt: z.string().max(40),
  coverage: z.enum(['session', 'reported-quota']),
  windows: z.array(windowSchema).max(50),
});

export type GeminiCliStats = z.infer<typeof geminiCliStatsSchema>;
