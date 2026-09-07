import type { FastifyInstance } from "fastify";

import { connectResponseSchema, connectionsResponseSchema, providerIdSchema } from "@devgauge/contracts";
import { errorEnvelopeSchema } from "@devgauge/contracts";
import { getConnection, listConnectionsByUser, upsertConnection } from "@devgauge/database";

import { connectConnection, disconnectConnection } from "../services/connection-service.js";
import { toConnectionDto } from "../services/mappers.js";
import { refreshProviderUsage } from "../services/usage-service.js";

export const buildConnectionsRoutes = (app: FastifyInstance): void => {
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
    const credential = (request.body as { credential?: string } | undefined)?.credential;
    await connectConnection(app.db, app.crypto, {
      userId: auth.userId,
      provider: parsed.data,
      credential: credential ?? "placeholder-credential",
      credentialType: `${parsed.data}:api_key`,
    });
    const connection = await upsertConnection(app.db, { userId: auth.userId, provider: parsed.data });
    // Seed the first snapshot immediately so the read model is live.
    await refreshProviderUsage(app.db, {
      userId: auth.userId,
      provider: parsed.data,
      adapterVersion: "phase4-mock-0.1.0",
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