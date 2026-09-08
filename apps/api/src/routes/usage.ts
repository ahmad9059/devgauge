import type { FastifyInstance } from "fastify";

import { CODEX_JOB_NAMES, historyResponseSchema, providerIdSchema, usageProviderResponseSchema, usageReadResponseSchema } from "@devgauge/contracts";
import { errorEnvelopeSchema } from "@devgauge/contracts";
import { getConnection } from "@devgauge/database";

import type { ApiEnv } from "../env.js";
import { getHistory, getUsageReadModel, refreshProviderUsage } from "../services/usage-service.js";

const ADAPTER_VERSION = "provider-adapter-0.1.0";

export const buildUsageRoutes = (app: FastifyInstance, env: ApiEnv): void => {
  app.get("/v1/usage", { preHandler: app.requireAuth }, async (request) => {
    const auth = request.auth!;
    const providers = await getUsageReadModel(app.db, auth.userId);
    return usageReadResponseSchema.parse({
      revision: providers.map((provider) => `${provider.provider}:${provider.fetchedAt}`).join("|"),
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

  app.post("/v1/usage/:provider/refresh", { preHandler: app.requireAuth }, async (request, reply) => {
    const auth = request.auth!;
    const { provider } = request.params as { provider: string };
    const parsed = providerIdSchema.safeParse(provider);
    if (!parsed.success) return reply.code(400).send(errorEnvelopeSchema.parse({
      error: { code: "invalid_input", message: "Unknown provider", requestId: request.id },
    }));
    const connection = await getConnection(app.db, auth.userId, parsed.data);
    if (!connection || connection.state !== "connected") return reply.code(409).send(errorEnvelopeSchema.parse({
      error: { code: "invalid_input", message: "Provider is not connected", requestId: request.id },
    }));

    if (parsed.data === "codex" && env.FEATURE_MOCK_TRANSPORT !== "true") {
      if (env.KILLSWITCH_PROVIDER_CODEX === "true" || !app.providerQueue) return reply.code(503).send(errorEnvelopeSchema.parse({
        error: { code: "transient_upstream", message: "Codex refresh is temporarily unavailable", requestId: request.id },
      }));
      const idempotencyKey = `foreground-${Math.floor(Date.now() / (5 * 60_000))}`;
      const jobId = `codex-refresh-${connection.id}-${idempotencyKey}`;
      await app.providerQueue.add(CODEX_JOB_NAMES.refresh, {
        userId: auth.userId,
        connectionId: connection.id,
        requestId: request.id,
        idempotencyKey,
      }, { jobId, attempts: 3, backoff: { type: "exponential", delay: 1_000 }, removeOnComplete: 100, removeOnFail: 500 });
      return reply.code(202).send({ status: "queued", jobId });
    }

    await refreshProviderUsage(app.db, {
      userId: auth.userId,
      provider: parsed.data,
      adapterVersion: ADAPTER_VERSION,
      ctx: {
        crypto: app.crypto,
        mockTransport: env.FEATURE_MOCK_TRANSPORT === "true",
        copilotRuntimeMode: env.COPILOT_RUNTIME_MODE,
      },
    });
    return { status: "completed", jobId: null };
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
