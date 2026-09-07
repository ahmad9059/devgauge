import type { FastifyInstance } from "fastify";

import { magicLinkRequestSchema, magicLinkVerifySchema, sessionResponseSchema } from "@devgauge/contracts";
import { errorEnvelopeSchema } from "@devgauge/contracts";
import {
  consumeMagicCode,
  createMagicCode,
  createSession,
  generateSessionToken,
  getOrCreateUser,
  hashMagicCode,
  hashToken,
  revokeSession,
} from "@devgauge/database";

import type { ApiEnv } from "../env.js";

export const buildAuthRoutes = (app: FastifyInstance, env: ApiEnv): void => {
  app.post("/v1/auth/magic-link/request", async (request, reply) => {
    const parsed = magicLinkRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(
        errorEnvelopeSchema.parse({
          error: { code: "invalid_input", message: "Valid email required", requestId: request.id },
        })
      );
    }
    const emailLower = parsed.data.email.trim().toLowerCase();
    const { code } = await createMagicCode(app.db, {
      emailLower,
      ttlMinutes: env.MAGIC_LINK_TTL_MINUTES,
    });

    // No SMTP provider wired in Phase 4; dev/test return the code so the flow
    // is exercisable end to end. Production must deliver via email.
    return env.NODE_ENV === "production"
      ? { ok: true }
      : { ok: true, code };
  });

  app.post("/v1/auth/magic-link/verify", async (request, reply) => {
    const parsed = magicLinkVerifySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(
        errorEnvelopeSchema.parse({
          error: { code: "invalid_input", message: "Email and code required", requestId: request.id },
        })
      );
    }
    const emailLower = parsed.data.email.trim().toLowerCase();
    const consumed = await consumeMagicCode(app.db, {
      emailLower,
      codeHash: hashMagicCode(parsed.data.code.trim()),
    });
    if (!consumed) {
      return reply.code(401).send(
        errorEnvelopeSchema.parse({
          error: { code: "unauthenticated", message: "Invalid or expired code", requestId: request.id },
        })
      );
    }

    const user = await getOrCreateUser(app.db, parsed.data.email);
    const token = generateSessionToken();
    const session = await createSession(app.db, {
      userId: user.id,
      tokenHash: hashToken(token),
      ttlHours: env.AUTH_SESSION_TTL_HOURS,
    });

    return sessionResponseSchema.parse({
      token,
      expiresAt: session.expiresAt.toISOString(),
    });
  });

  app.post("/v1/auth/logout", { preHandler: app.requireAuth }, async (request) => {
    const auth = request.auth;
    if (auth) {
      await revokeSession(app.db, auth.sessionId);
    }
    return { ok: true };
  });
};