import { createDocument } from "zod-openapi";
import * as z from "zod";

import { errorEnvelopeSchema, providerConnectionSchema, providerUsageSchema } from "./index.js";

// Components are registered by tagging schemas with OpenAPI metadata.
const ProviderUsage = providerUsageSchema.meta({
  id: "ProviderUsage",
  description: "Normalized usage snapshot for one provider.",
});

const ProviderConnection = providerConnectionSchema.meta({
  id: "ProviderConnection",
  description: "Lifecycle state of a provider connection.",
});

const ErrorEnvelope = errorEnvelopeSchema.meta({
  id: "ErrorEnvelope",
  description: "Standard API error envelope.",
});

/**
 * Deterministic OpenAPI 3.1 document built from the same Zod schemas that
 * validate every network/process boundary.
 */
export const buildOpenApiDocument = (): ReturnType<typeof createDocument> =>
  createDocument({
    openapi: "3.1.0",
    info: {
      title: "DevGauge API",
      version: "1.0.0",
      description: "Unified AI coding usage monitoring API.",
    },
    paths: {
      "/v1/usage": {
        get: {
          summary: "Latest normalized usage for every connected provider",
          tags: ["Usage"],
          responses: {
            "200": {
              description: "Current usage read model",
              content: { "application/json": { schema: ProviderUsage } },
            },
            "401": {
              description: "Unauthenticated",
              content: { "application/json": { schema: ErrorEnvelope } },
            },
          },
        },
      },
      "/v1/connections": {
        get: {
          summary: "List provider connections",
          tags: ["Connections"],
          responses: {
            "200": {
              description: "Provider connections",
              content: {
                "application/json": { schema: z.array(ProviderConnection) },
              },
            },
          },
        },
      },
    },
  });