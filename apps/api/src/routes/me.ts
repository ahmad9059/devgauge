import type { FastifyInstance } from "fastify";

import { CODEX_JOB_NAMES, errorEnvelopeSchema, meSchema } from "@devgauge/contracts";
import { getConnection, getOwnedProfileArtifact, hardDeleteUser, insertTombstone, revokeAllSessions } from "@devgauge/database";

export const buildMeRoutes = (app: FastifyInstance): void => {
  app.get("/v1/me", { preHandler: app.requireAuth }, async (request) => {
    const auth = request.auth!;
    return meSchema.parse({
      id: auth.userId,
      email: auth.email,
      displayName: null,
      locale: auth.locale,
      timezone: auth.timezone,
      lifecycleStatus: auth.lifecycleStatus,
      createdAt: new Date().toISOString(),
    });
  });

  // Codex profiles are removed from object storage before the database cascade.
  app.delete("/v1/me", { preHandler: app.requireAuth }, async (request, reply) => {
    const auth = request.auth!;
    await revokeAllSessions(app.db, auth.userId);
    await insertTombstone(app.db, "user", auth.userId);
    const codex = await getConnection(app.db, auth.userId, "codex");
    const profile = codex ? await getOwnedProfileArtifact(app.db, codex.id, auth.userId) : undefined;
    if (codex && profile) {
      if (!app.providerQueue) {
        return reply.code(503).send(errorEnvelopeSchema.parse({
          error: { code: "transient_upstream", message: "Account deletion queue is unavailable", requestId: request.id },
        }));
      }
      const idempotencyKey = globalThis.crypto.randomUUID();
      await app.providerQueue.add(CODEX_JOB_NAMES.deleteAccount, {
        userId: auth.userId,
        connectionId: codex.id,
        requestId: request.id,
        idempotencyKey,
      }, {
        jobId: `codex-account-delete-${auth.userId}`,
        attempts: 5,
        backoff: { type: "exponential", delay: 1_000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      });
      return { ok: true, pending: true };
    }
    await hardDeleteUser(app.db, auth.userId);
    return { ok: true };
  });
};
