import { z } from 'zod';

/**
 * Tolerant-but-anchored schema for GitHub billing usage responses. `usageItems`
 * is required so a changed/unknown payload fails closed instead of being read
 * as zero usage. Unknown extra fields are ignored.
 */
const usageItemSchema = z.object({
  product: z.string().optional(),
  sku: z.string().optional(),
  unitType: z.string().optional(),
  quantity: z.union([z.number(), z.string()]).optional(),
  grossAmount: z.number().optional(),
  discountAmount: z.number().optional(),
  netAmount: z.number().optional(),
  pricePerUnit: z.number().optional(),
});

const timePeriodSchema = z
  .object({
    year: z.number().int().min(2000).max(2200),
    month: z.number().int().min(1).max(12),
  })
  .optional();

export const rawBillingUsageSchema = z.object({
  usageItems: z.array(usageItemSchema).max(1000),
  timePeriod: timePeriodSchema,
  billingPeriod: timePeriodSchema,
});

export type RawBillingUsage = z.infer<typeof rawBillingUsageSchema>;
export type RawUsageItem = z.infer<typeof usageItemSchema>;
