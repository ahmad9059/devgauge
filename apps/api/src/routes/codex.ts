import { randomUUID } from "node:crypto";

import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";

import { CODEX_JOB_NAMES, errorEnvelopeSchema } from "@devgauge/contracts";
import {
  cancelOwnedCodexLoginAttempt,
  cancelActiveCodexLoginAttempts,
  countRecentCodexResetAttempts,
  createCodexLoginAttempt,
  createCodexResetAttempt,
  finishCodexResetAttempt,
  getCodexResetAttemptByKey,
  getConnection,
  getLatestCodexMetadata,
  getOwnedCodexLoginAttempt,
  getOwnedCodexResetAttempt,
  insertAudit,
  setCodexLoginCode,
  updateConnectionState,
  upsertConnection,
} from "@devgauge/database";

import type { ApiEnv } from "../env.js";
import { getFeatureFlags } from "../flags.js";

const startSchema = z.object({ resumeAttemptId: z.uuid().optional() }).optional();
const resetSchema = z.object({
  confirmed: z.literal(true),
  idempotencyKey: z.uuid(),
  creditId: z.string().min(1).optional(),
});

const error = (reply: FastifyReply, requestId: string, status: number, code: string, message: string) =>
  reply.code(status).send(errorEnvelopeSchema.parse({ error: { code, message, requestId } }));

const enqueue = async (
  app: FastifyInstance,
  name: string,
  data: { userId: string; connectionId: string; requestId: string; idempotencyKey: string; attemptId?: string },
  jobId: string
): Promise<void> => {
  if (!app.providerQueue) throw new Error("Provider queue is unavailable");
  await app.providerQueue.add(name, data, {
    jobId,
    attempts: 3,
    backoff: { type: "exponential", delay: 1_000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  });
};

export const buildCodexRoutes = (app: FastifyInstance, env: ApiEnv): void => {
  app.post("/v1/connections/codex/device-login", { preHandler: app.requireAuth }, async (request, reply) => {
    const auth = request.auth!;
    const body = startSchema.safeParse(request.body);
    if (!body.success) return error(reply, request.id, 400, "invalid_input", "Malformed login request");
    const flags = getFeatureFlags(env);
    if (flags.killSwitches.codex) return error(reply, request.id, 503, "transient_upstream", "Codex is temporarily disabled");

    if (body.data?.resumeAttemptId) {
      const existing = await getOwnedCodexLoginAttempt(app.db, body.data.resumeAttemptId, auth.userId);
      if (existing) return { attemptId: existing.id, status: existing.status, expiresAt: existing.expiresAt.toISOString() };
    }

    const connection = await upsertConnection(app.db, { userId: auth.userId, provider: "codex" });
    await cancelActiveCodexLoginAttempts(app.db, connection.id, auth.userId);
    await updateConnectionState(app.db, {
      id: connection.id,
      userId: auth.userId,
      state: "connecting",
      refreshState: "queued",
    });
    const attemptId = randomUUID();
    const jobId = `codex-login-${attemptId}`;
    const attempt = await createCodexLoginAttempt(app.db, {
      id: attemptId,
      userId: auth.userId,
      connectionId: connection.id,
      expiresAt: new Date(Date.now() + 15 * 60_000),
      jobId,
    });

    if (flags.mockTransport) {
      const sealed = app.crypto.seal(Buffer.from("ABCD-1234", "utf8"));
      await setCodexLoginCode(app.db, {
        id: attempt.id,
        userId: auth.userId,
        loginIdHash: "mock",
        verificationUrl: "https://auth.openai.com/codex/device",
        ciphertext: sealed.ciphertext,
        wrappedDataKey: sealed.wrappedDataKey,
        keyVersion: sealed.keyVersion,
      });
    } else {
      if (!app.providerQueue) return error(reply, request.id, 503, "transient_upstream", "Codex login queue is unavailable");
      await enqueue(app, CODEX_JOB_NAMES.login, {
        userId: auth.userId,
        connectionId: connection.id,
        requestId: request.id,
        idempotencyKey: attempt.id,
        attemptId: attempt.id,
      }, jobId);
    }
    return reply.code(202).send({ attemptId: attempt.id, status: flags.mockTransport ? "code_ready" : "queued", expiresAt: attempt.expiresAt.toISOString() });
  });

  app.get("/v1/connections/codex/device-login/:attemptId", { preHandler: app.requireAuth }, async (request, reply) => {
    const auth = request.auth!;
    const { attemptId } = request.params as { attemptId: string };
    const attempt = await getOwnedCodexLoginAttempt(app.db, attemptId, auth.userId);
    if (!attempt) return error(reply, request.id, 404, "not_found", "Login attempt not found");
    if (attempt.status === "connected" && app.providerQueue && env.KILLSWITCH_PROVIDER_CODEX !== "true") {
      await app.providerQueue.upsertJobScheduler(
        `codex-background-${attempt.connectionId}`,
        { every: 15 * 60_000 },
        {
          name: CODEX_JOB_NAMES.refresh,
          data: {
            userId: auth.userId,
            connectionId: attempt.connectionId,
            requestId: `scheduled-${attempt.connectionId}`,
            idempotencyKey: `background-${attempt.connectionId}`,
          },
          opts: { attempts: 3, backoff: { type: "exponential", delay: 1_000 }, removeOnComplete: 100, removeOnFail: 500 },
        }
      );
    }
    let userCode: string | null = null;
    if (attempt.status === "code_ready" && attempt.userCodeCiphertext && attempt.userCodeWrappedDataKey && attempt.userCodeKeyVersion) {
      userCode = app.crypto.open({
        ciphertext: Buffer.from(attempt.userCodeCiphertext),
        wrappedDataKey: Buffer.from(attempt.userCodeWrappedDataKey),
        keyVersion: attempt.userCodeKeyVersion,
      }).toString("utf8");
    }
    return {
      attemptId: attempt.id,
      status: attempt.expiresAt.getTime() <= Date.now() && !["connected", "failed", "cancelled"].includes(attempt.status) ? "expired" : attempt.status,
      verificationUrl: attempt.verificationUrl,
      userCode,
      expiresAt: attempt.expiresAt.toISOString(),
      plan: attempt.planType,
      errorCode: attempt.errorCode,
    };
  });

  app.post("/v1/connections/codex/device-login/:attemptId/cancel", { preHandler: app.requireAuth }, async (request) => {
    const auth = request.auth!;
    const { attemptId } = request.params as { attemptId: string };
    return { cancelled: await cancelOwnedCodexLoginAttempt(app.db, attemptId, auth.userId) };
  });

  app.post("/v1/connections/codex/reset-credit", { preHandler: app.requireAuth }, async (request, reply) => {
    const auth = request.auth!;
    const parsed = resetSchema.safeParse(request.body);
    if (!parsed.success) return error(reply, request.id, 400, "invalid_input", "Explicit confirmation and a valid idempotency key are required");
    const flags = getFeatureFlags(env);
    if (!flags.codexResetCreditMutation || flags.killSwitches.codex) {
      return error(reply, request.id, 403, "forbidden", "Codex reset-credit mutation is disabled");
    }
    const connection = await getConnection(app.db, auth.userId, "codex");
    if (!connection || connection.state !== "connected") return error(reply, request.id, 409, "conflict", "Codex is not connected");
    const existing = await getCodexResetAttemptByKey(app.db, connection.id, auth.userId, parsed.data.idempotencyKey);
    if (existing) return reply.code(202).send({ attemptId: existing.id, status: existing.status });
    const metadata = await getLatestCodexMetadata(app.db, auth.userId, connection.id);
    if (!metadata?.resetCredits || metadata.resetCredits.availableCount === 0) {
      return error(reply, request.id, 409, "conflict", "No earned Codex reset credit is available");
    }
    if (parsed.data.creditId) {
      const credit = metadata.resetCredits.credits?.find((candidate) => candidate.id === parsed.data.creditId);
      if (!credit || credit.status !== "available") {
        return error(reply, request.id, 409, "conflict", "The selected reset credit is unavailable");
      }
    }
    if (await countRecentCodexResetAttempts(app.db, auth.userId, new Date(Date.now() - 60 * 60_000)) >= 3) {
      return error(reply, request.id, 429, "provider_limited", "Too many reset-credit attempts");
    }
    const jobId = `codex-reset-${connection.id}-${parsed.data.idempotencyKey}`;
    const attempt = await createCodexResetAttempt(app.db, {
      userId: auth.userId,
      connectionId: connection.id,
      idempotencyKey: parsed.data.idempotencyKey,
      ...(parsed.data.creditId ? { creditId: parsed.data.creditId } : {}),
      jobId,
    });
    await insertAudit(app.db, {
      userId: auth.userId,
      actor: "user",
      action: "codex.reset_credit.requested",
      resourceType: "provider_connection",
      resourceId: connection.id,
    });
    if (flags.mockTransport) {
      await finishCodexResetAttempt(app.db, { id: attempt.id, status: "completed", outcome: "noCredit" });
    } else {
      if (!app.providerQueue) return error(reply, request.id, 503, "transient_upstream", "Codex mutation queue is unavailable");
      await enqueue(app, CODEX_JOB_NAMES.resetCredit, {
        userId: auth.userId,
        connectionId: connection.id,
        requestId: request.id,
        idempotencyKey: parsed.data.idempotencyKey,
        attemptId: attempt.id,
      }, jobId);
    }
    return reply.code(202).send({ attemptId: attempt.id, status: flags.mockTransport ? "completed" : attempt.status });
  });

  app.get("/v1/connections/codex/reset-credit/:attemptId", { preHandler: app.requireAuth }, async (request, reply) => {
    const auth = request.auth!;
    const { attemptId } = request.params as { attemptId: string };
    const attempt = await getOwnedCodexResetAttempt(app.db, attemptId, auth.userId);
    if (!attempt) return error(reply, request.id, 404, "not_found", "Reset-credit attempt not found");
    return { attemptId: attempt.id, status: attempt.status, outcome: attempt.outcome, errorCode: attempt.errorCode };
  });
};
