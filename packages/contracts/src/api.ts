import { z } from "zod";

import { providerIdSchema } from "./provider.js";
import { providerConnectionSchema } from "./connections.js";
import { providerUsageSchema } from "./usage.js";

export const providerCapabilitySchema = z.object({
  provider: providerIdSchema,
  name: z.string(),
  connectionMethod: z.string(),
  shipInV1: z.boolean(),
  sourceLabel: z.string(),
});

export type ProviderCapability = z.infer<typeof providerCapabilitySchema>;

export const providersResponseSchema = z.object({
  providers: z.array(providerCapabilitySchema),
});

export const connectionsResponseSchema = z.object({
  connections: z.array(providerConnectionSchema),
});

export const connectResponseSchema = z.object({
  connection: providerConnectionSchema,
});

export const usageReadResponseSchema = z.object({
  revision: z.string(),
  serverTime: z.string().datetime({ offset: true }),
  providers: z.array(providerUsageSchema),
  stale: z.boolean(),
});

export type UsageReadResponse = z.infer<typeof usageReadResponseSchema>;

export const usageProviderResponseSchema = providerUsageSchema;

export const historyResponseSchema = z.object({
  items: z.array(providerUsageSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export type HistoryResponse = z.infer<typeof historyResponseSchema>;