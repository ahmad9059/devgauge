import type { FastifyInstance } from "fastify";

import { meSchema } from "@devgauge/contracts";
import { hardDeleteUser, insertTombstone, revokeAllSessions } from "@devgauge/database";

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

  // Account deletion: revoke sessions, tombstone (deletion ledger), hard delete.
  app.delete("/v1/me", { preHandler: app.requireAuth }, async (request) => {
    const auth = request.auth!;
    await revokeAllSessions(app.db, auth.userId);
    await insertTombstone(app.db, "user", auth.userId);
    await hardDeleteUser(app.db, auth.userId);
    return { ok: true };
  });
};