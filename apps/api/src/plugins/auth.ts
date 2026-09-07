import type { FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

import type { SessionClaims } from "@devgauge/contracts";
import { errorEnvelopeSchema } from "@devgauge/contracts";
import { findSessionWithUser, hashToken, touchSession } from "@devgauge/database";

declare module "fastify" {
  interface FastifyRequest {
    auth?: SessionClaims;
  }
  interface FastifyInstance {
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const unauthorized = (request: FastifyRequest, reply: FastifyReply): FastifyReply => {
  return reply.code(401).send(
    errorEnvelopeSchema.parse({
      error: { code: "unauthenticated", message: "Authentication required", requestId: request.id },
    })
  );
};

export const registerAuth = fp(async (app) => {
  app.decorateRequest("auth", undefined);

  app.decorate("requireAuth", async (request, reply) => {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return unauthorized(request, reply);
    }
    const token = header.slice("Bearer ".length).trim();
    if (!token) {
      return unauthorized(request, reply);
    }

    const found = await findSessionWithUser(app.db, hashToken(token));
    if (!found) {
      return unauthorized(request, reply);
    }
    const { session, user } = found;
    if (session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      return unauthorized(request, reply);
    }
    if (user.lifecycleStatus !== "active") {
      return reply.code(403).send(
        errorEnvelopeSchema.parse({
          error: { code: "forbidden", message: "Account is not active", requestId: request.id },
        })
      );
    }

    request.auth = {
      userId: user.id,
      sessionId: session.id,
      email: user.email,
      locale: user.locale,
      timezone: user.timezone,
      lifecycleStatus: user.lifecycleStatus,
    };
    void touchSession(app.db, session.id);
  });
});