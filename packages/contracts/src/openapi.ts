import { createDocument } from "zod-openapi";
import * as z from "zod";

import { alertEventsResponseSchema, alertsResponseSchema } from "./alerts.js";
import { errorEnvelopeSchema } from "./errors.js";
import { historySeriesResponseSchema } from "./history.js";
import { providerConnectionSchema } from "./connections.js";
import { providerUsageSchema } from "./usage.js";
import { usageReadResponseSchema } from "./api.js";

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

const UsageReadResponse = usageReadResponseSchema.meta({
  id: "UsageReadResponse",
  description: "Current usage read model envelope with revision and server time.",
});

const HistorySeries = historySeriesResponseSchema.meta({
  id: "HistorySeries",
  description: "Cursor-paginated history series for one provider/window.",
});

const Alerts = alertsResponseSchema.meta({ id: "Alerts", description: "User alert rules." });
const AlertEvents = alertEventsResponseSchema.meta({ id: "AlertEvents", description: "Recent alert events." });

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
              content: { "application/json": { schema: UsageReadResponse } },
            },
            "401": {
              description: "Unauthenticated",
              content: { "application/json": { schema: ErrorEnvelope } },
            },
          },
        },
      },
      "/v1/usage/{provider}": {
        get: {
          summary: "Latest normalized usage for one provider",
          tags: ["Usage"],
          responses: {
            "200": {
              description: "Single provider usage snapshot",
              content: { "application/json": { schema: ProviderUsage } },
            },
          },
        },
      },
      "/v1/usage/{provider}/refresh": {
        post: {
          summary: "Queue or run a provider refresh",
          tags: ["Usage"],
          responses: {
            "200": {
              description: "Refresh completed or queued",
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
      "/v1/history/{provider}": {
        get: {
          summary: "Cursor-paginated history series for one provider/window",
          tags: ["History"],
          responses: {
            "200": {
              description: "History series",
              content: { "application/json": { schema: HistorySeries } },
            },
            "401": {
              description: "Unauthenticated",
              content: { "application/json": { schema: ErrorEnvelope } },
            },
          },
        },
      },
      "/v1/alerts": {
        get: {
          summary: "List user alert rules",
          tags: ["Alerts"],
          responses: {
            "200": {
              description: "Alert rules",
              content: { "application/json": { schema: Alerts } },
            },
          },
        },
      },
      "/v1/alert-events": {
        get: {
          summary: "Recent alert events",
          tags: ["Alerts"],
          responses: {
            "200": {
              description: "Alert events",
              content: { "application/json": { schema: AlertEvents } },
            },
          },
        },
      },
    },
  });