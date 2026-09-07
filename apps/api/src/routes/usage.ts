import type { FastifyInstance } from "fastify";

import { historyResponseSchema, providerIdSchema, usageProviderResponseSchema, usageReadResponseSchema } from "@devgauge/contracts";
import { errorEnvelopeSchema } from "@devgauge/contracts";
import { getConnection } from "@devgauge/database";

import { getHistory, getUsageReadModel, refreshProviderUsage } from "../services/usage-service.js";

const ADAPTER_VERSION = "phase4-mock-0.1.0";

export const buildUsageRoutes = (app: FastifyInstance): void => {
  app.get("/v1/usage", { preHandler: app.requireAuth }, async (request) => {
    const auth = request.auth!;
    const providers = await getUsageReadModel(app.db, auth.userId);
    return usageReadResponseSchema.parse({
      revision: String(Date.now()),
      serverTime: new Date().toISOString(),
      providers,
      stale: providers.some((p) => p.stale),
    });
  });

  app.get("/v1/usage/:provider", { preHandler: app.requireAuth }, async (request, reply) => {
    const auth = request.auth!;
    const { provider } = request.params as { provider: string };
    const parsed = providerIdSchema.safeParse(provider);
    if (!parsed.success) {
      return reply.code(400).send(
        errorEnvelopeSchema.parse({
          error: { code: "invalid_input", message: "Unknown provider", requestId: request.id },
        })
      );
    }
    const connection = await getConnection(app.db, auth.userId, parsed.data);
    if (connection?.state === "connected") {
      // Mock transport: refresh on read so the vertical slice stays live.
      await refreshProviderUsage(app.db, {
        userId: auth.userId,
        provider: parsed.data,
        adapterVersion: ADAPTER_VERSION,
      });
    }
    const providers = await getUsageReadModel(app.db, auth.userId);
    const found = providers.find((p) => p.provider === parsed.data);
    if (!found) {
      return reply.code(404).send(
        errorEnvelopeSchema.parse({
          error: { code: "not_found", message: "No usage snapshot yet", requestId: request.id },
        })
      );
    }
    return usageProviderResponseSchema.parse(found);
  });

  app.get("/v1/usage/:provider/history", { preHandler: app.requireAuth }, async (request, reply) => {
    const auth = request.auth!;
    const { provider } = request.params as { provider: string };
    const query = request.query as { cursor?: string; limit?: string };
    const parsed = providerIdSchema.safeParse(provider);
    if (!parsed.success) {
      return reply.code(400).send(
        errorEnvelopeSchema.parse({
          error: { code: "invalid_input", message: "Unknown provider", requestId: request.id },
        })
      );
    }
    const limit = Number.parseInt(query.limit ?? "20", 10);
    const page = await getHistory(app.db, {
      userId: auth.userId,
      provider: parsed.data,
      ...(query.cursor ? { beforeId: query.cursor } : {}),
      limit: Number.isFinite(limit) ? limit : 20,
    });
    return historyResponseSchema.parse(page);
  });
};