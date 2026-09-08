import type { FastifyInstance } from "fastify";

import { CODEX_JOB_NAMES, connectResponseSchema, connectionsResponseSchema, providerIdSchema } from "@devgauge/contracts";
import { errorEnvelopeSchema } from "@devgauge/contracts";
import { getConnection, listConnectionsByUser, upsertConnection } from "@devgauge/database";
import { ProviderError } from "@devgauge/provider-core";
import { fetchOpenCodeGoUsage } from "@devgauge/provider-opencode-go";

import type { ApiEnv } from "../env.js";
import { connectConnection, disconnectConnection } from "../services/connection-service.js";
import { toConnectionDto } from "../services/mappers.js";
import { refreshProviderUsage } from "../services/usage-service.js";

export const buildConnectionsRoutes = (app: FastifyInstance, env: ApiEnv): void => {
  app.get("/v1/connections", { preHandler: app.requireAuth }, async (request) => {
    const auth = request.auth!;
    const rows = await listConnectionsByUser(app.db, auth.userId);
    return connectionsResponseSchema.parse({ connections: rows.map(toConnectionDto) });
  });

  app.post("/v1/connections/:provider/connect", { preHandler: app.requireAuth }, async (request, reply) => {
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
    const apiKey = (request.body as { credential?: string } | undefined)?.credential;
    if (parsed.data === "github-copilot" || parsed.data === "codex") {
      return reply.code(400).send(
        errorEnvelopeSchema.parse({
          error: {
            code: "invalid_input",
            message: parsed.data === "codex"
              ? "Codex uses device login. Start at /v1/connections/codex/device-login"
              : "GitHub Copilot uses OAuth. Start at /v1/connections/github-copilot/authorize",
            requestId: request.id,
          },
        })
      );
    }
    if (!apiKey) {
      return reply.code(400).send(
        errorEnvelopeSchema.parse({
          error: { code: "invalid_input", message: "Credential is required", requestId: request.id },
        })
      );
    }

    // When mock transport is off, validate the real OpenCode Go key before
    // storing it. Errors map to provider_unauthorized / entitlement_required.
    if (parsed.data === "opencode-go" && env.FEATURE_MOCK_TRANSPORT !== "true") {
      try {
        await fetchOpenCodeGoUsage({ apiKey });
      } catch (error) {
        if (error instanceof ProviderError) {
          const status = error.code === "entitlement_required" ? 403 : 401;
          return reply.code(status).send(
            errorEnvelopeSchema.parse({
              error: { code: error.code, message: error.message, requestId: request.id },
            })
          );
        }
        throw error;
      }
    }

    await connectConnection(app.db, app.crypto, {
      userId: auth.userId,
      provider: parsed.data,
      credential: apiKey,
      credentialType: `${parsed.data}:api_key`,
    });
    const connection = await upsertConnection(app.db, { userId: auth.userId, provider: parsed.data });
    // Seed the first snapshot immediately so the read model is live.
    await refreshProviderUsage(app.db, {
      userId: auth.userId,
      provider: parsed.data,
      adapterVersion: "provider-adapter-0.1.0",
      ctx: {
        crypto: app.crypto,
        mockTransport: env.FEATURE_MOCK_TRANSPORT === "true",
        copilotRuntimeMode: env.COPILOT_RUNTIME_MODE,
      },
    });
    const refreshed = await getConnection(app.db, auth.userId, parsed.data);
    return connectResponseSchema.parse({ connection: toConnectionDto(refreshed ?? connection) });
  });

  app.post("/v1/connections/:provider/disconnect", { preHandler: app.requireAuth }, async (request, reply) => {
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
    if (parsed.data === "codex" && app.providerQueue) {
      const connection = await getConnection(app.db, auth.userId, "codex");
      if (connection) {
        await app.providerQueue.removeJobScheduler(`codex-background-${connection.id}`);
        const idempotencyKey = globalThis.crypto.randomUUID();
        await app.providerQueue.add(CODEX_JOB_NAMES.disconnect, {
          userId: auth.userId,
          connectionId: connection.id,
          requestId: request.id,
          idempotencyKey,
        }, {
          jobId: `codex-disconnect-${connection.id}-${idempotencyKey}`,
          attempts: 3,
          backoff: { type: "exponential", delay: 1_000 },
          removeOnComplete: 100,
          removeOnFail: 500,
        });
      }
    }
    await disconnectConnection(app.db, { userId: auth.userId, provider: parsed.data });
    const connection = await getConnection(app.db, auth.userId, parsed.data);
    if (!connection) {
      return reply.code(404).send(
        errorEnvelopeSchema.parse({
          error: { code: "not_found", message: "Connection not found", requestId: request.id },
        })
      );
    }
    return connectResponseSchema.parse({ connection: toConnectionDto(connection) });
  });
};
