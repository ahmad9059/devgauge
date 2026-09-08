import type { Job } from "bullmq";
import type { Redis } from "ioredis";
import { z } from "zod";

import type { Db } from "@devgauge/database";
import {
  claimCodexResetAttempt,
  deleteOwnedProfileArtifact,
  finishCodexLoginAttempt,
  finishCodexResetAttempt,
  getOwnedCodexLoginAttempt,
  getOwnedConnection,
  insertAudit,
  setCodexLoginCode,
  updateConnectionState,
} from "@devgauge/database";
import { createCryptoService } from "@devgauge/provider-core";
import {
  CODEX_VERSION,
  accountUpdatedSchema,
  awaitLoginCompletion,
  cancelLogin,
  consumeResetCreditAndRefresh,
  normalizeActivitySummary,
  normalizeRateLimits,
  refreshCodexUsage,
  startDeviceCodeLogin,
  logout,
  withCodexSession,
} from "@devgauge/provider-codex";

import { createCodexProfileContext, hashCodexLoginId } from "../codex-runtime.js";
import { persistCodexUsage } from "../codex-usage.js";
import type { WorkerEnv } from "../env.js";
import { withConnectionLock } from "../locks.js";
import type { ObjectStorage } from "../object-storage.js";

const baseJobSchema = z.object({
  userId: z.string().uuid(),
  connectionId: z.string().uuid(),
  requestId: z.string().min(1),
  idempotencyKey: z.string().min(1),
});

const loginJobSchema = baseJobSchema.extend({ attemptId: z.string().uuid() });
const refreshJobSchema = baseJobSchema;
const resetJobSchema = baseJobSchema.extend({ attemptId: z.string().uuid() });

export interface CodexJobContext {
  env: WorkerEnv;
  db: Db;
  redis: Redis;
  storage: ObjectStorage;
}

const supervisorOptions = (ctx: CodexJobContext, profile: Awaited<ReturnType<typeof createCodexProfileContext>>) => ({
  binaryPath: ctx.env.CODEX_BINARY_PATH,
  ...(ctx.env.CODEX_TEMP_DIR ? { tempBase: ctx.env.CODEX_TEMP_DIR } : {}),
  ...(profile.artifact ? { profileArtifact: profile.artifact } : {}),
  persistProfile: profile.persist,
  requestTimeoutMs: Math.min(ctx.env.JOB_TIMEOUT_MS, 30_000),
  idleTimeoutMs: ctx.env.CODEX_LOGIN_TIMEOUT_MS,
  totalTimeoutMs: ctx.env.CODEX_LOGIN_TIMEOUT_MS,
});

const normalizedRefresh = async (session: Parameters<typeof refreshCodexUsage>[0]) => {
  const result = await refreshCodexUsage(session);
  const usage = normalizeRateLimits(result.rateLimits, new Date());
  if (result.usage) {
    usage.activity = result.usage.summary ? normalizeActivitySummary(result.usage.summary) : null;
    usage.dailyUsage = result.usage.dailyUsageBuckets;
  }
  return usage;
};

export const codexLoginProcessor = (ctx: CodexJobContext) => async (job: Job): Promise<unknown> => {
  const data = loginJobSchema.parse(job.data);
  return withConnectionLock(ctx.redis, data.connectionId, ctx.env.CODEX_LOGIN_TIMEOUT_MS + 30_000, async () => {
    const connection = await getOwnedConnection(ctx.db, data.connectionId, data.userId);
    const attempt = await getOwnedCodexLoginAttempt(ctx.db, data.attemptId, data.userId);
    if (!connection || connection.provider !== "codex" || !attempt) throw new Error("Codex login job ownership check failed");
    if (attempt.status === "cancelled") return { status: "cancelled" };
    if (!ctx.env.ENC_MASTER_KEY) throw new Error("ENC_MASTER_KEY is required");
    const crypto = createCryptoService(ctx.env.ENC_MASTER_KEY);
    const profile = await createCodexProfileContext(ctx.env, ctx.db, ctx.storage, data);
    let persistProfile = false;
    let planType: string | null = null;
    try {
      const usage = await withCodexSession(
        { ...supervisorOptions(ctx, profile), persistProfile: async (artifact) => {
          if (persistProfile) await profile.persist(artifact);
        } },
        async (session) => {
          session.onNotification("account/updated", (params) => {
            const parsed = accountUpdatedSchema.safeParse(params);
            if (parsed.success) planType = parsed.data.planType ?? null;
          });
          const login = await startDeviceCodeLogin(session);
          const code = crypto.seal(Buffer.from(login.userCode, "utf8"));
          const stored = await setCodexLoginCode(ctx.db, {
            id: data.attemptId,
            userId: data.userId,
            loginIdHash: hashCodexLoginId(login.loginId),
            verificationUrl: login.verificationUrl,
            ciphertext: code.ciphertext,
            wrappedDataKey: code.wrappedDataKey,
            keyVersion: code.keyVersion,
          });
          if (!stored) {
            await cancelLogin(session, login.loginId).catch(() => undefined);
            throw new Error("Codex login attempt was cancelled or expired");
          }

          const cancellation = setInterval(() => {
            void getOwnedCodexLoginAttempt(ctx.db, data.attemptId, data.userId).then((current) => {
              if (current?.status === "cancelled") void cancelLogin(session, login.loginId);
            });
          }, 1_000);
          cancellation.unref();
          try {
            const completed = await awaitLoginCompletion(session, login.loginId, ctx.env.CODEX_LOGIN_TIMEOUT_MS);
            if (!completed.success) throw new Error("Codex login was denied");
          } finally {
            clearInterval(cancellation);
          }
          persistProfile = true;
          return normalizedRefresh(session);
        }
      );
      await persistCodexUsage(ctx.db, {
        userId: data.userId,
        connectionId: data.connectionId,
        usage,
        adapterVersion: `codex-${CODEX_VERSION}`,
      });
      await updateConnectionState(ctx.db, {
        id: data.connectionId,
        userId: data.userId,
        state: "connected",
        refreshState: "succeeded",
        plan: planType ?? usage.plan,
        adapterVersion: `codex-${CODEX_VERSION}`,
        lastVerifiedAt: new Date(),
      });
      await finishCodexLoginAttempt(ctx.db, {
        id: data.attemptId,
        userId: data.userId,
        status: "connected",
        ...(planType ? { planType } : {}),
      });
      return { status: "connected" };
    } catch (error) {
      await finishCodexLoginAttempt(ctx.db, {
        id: data.attemptId,
        userId: data.userId,
        status: attempt.expiresAt.getTime() <= Date.now() ? "expired" : "failed",
        errorCode: "provider_unauthorized",
      });
      throw error;
    }
  });
};

export const codexRefreshProcessor = (ctx: CodexJobContext) => async (job: Job): Promise<unknown> => {
  const data = refreshJobSchema.parse(job.data);
  return withConnectionLock(ctx.redis, data.connectionId, ctx.env.JOB_TIMEOUT_MS, async () => {
    const connection = await getOwnedConnection(ctx.db, data.connectionId, data.userId);
    if (!connection || connection.provider !== "codex") throw new Error("Codex refresh job ownership check failed");
    const profile = await createCodexProfileContext(ctx.env, ctx.db, ctx.storage, data);
    if (!profile.artifact) throw new Error("Codex profile is not connected");
    const usage = await withCodexSession(supervisorOptions(ctx, profile), normalizedRefresh);
    const snapshotId = await persistCodexUsage(ctx.db, {
      userId: data.userId,
      connectionId: data.connectionId,
      usage,
      adapterVersion: `codex-${CODEX_VERSION}`,
    });
    return { status: "persisted", snapshotId };
  });
};

export const codexResetCreditProcessor = (ctx: CodexJobContext) => async (job: Job): Promise<unknown> => {
  const data = resetJobSchema.parse(job.data);
  return withConnectionLock(ctx.redis, data.connectionId, ctx.env.JOB_TIMEOUT_MS, async () => {
    const attempt = await claimCodexResetAttempt(ctx.db, data.attemptId);
    if (!attempt || attempt.userId !== data.userId || attempt.connectionId !== data.connectionId) {
      throw new Error("Codex reset-credit attempt is invalid or already claimed");
    }
    const profile = await createCodexProfileContext(ctx.env, ctx.db, ctx.storage, data);
    if (!profile.artifact) throw new Error("Codex profile is not connected");
    try {
      const result = await withCodexSession(supervisorOptions(ctx, profile), async (session) =>
        consumeResetCreditAndRefresh(session, attempt.idempotencyKey, attempt.creditId ?? undefined)
      );
      const usage = normalizeRateLimits(result.rateLimits, new Date());
      await persistCodexUsage(ctx.db, {
        userId: data.userId,
        connectionId: data.connectionId,
        usage,
        adapterVersion: `codex-${CODEX_VERSION}`,
      });
      await finishCodexResetAttempt(ctx.db, { id: attempt.id, status: "completed", outcome: result.outcome });
      await insertAudit(ctx.db, {
        userId: data.userId,
        actor: "user",
        action: "codex.reset_credit.completed",
        resourceType: "provider_connection",
        resourceId: data.connectionId,
        metadata: { outcome: result.outcome },
      });
      return result;
    } catch (error) {
      await finishCodexResetAttempt(ctx.db, { id: attempt.id, status: "failed", errorCode: "transient_upstream" });
      throw error;
    }
  });
};

export const codexDisconnectProcessor = (ctx: CodexJobContext) => async (job: Job): Promise<unknown> => {
  const data = refreshJobSchema.parse(job.data);
  return withConnectionLock(ctx.redis, data.connectionId, ctx.env.JOB_TIMEOUT_MS, async () => {
    const profile = await createCodexProfileContext(ctx.env, ctx.db, ctx.storage, data);
    if (profile.artifact) {
      await withCodexSession(
        { ...supervisorOptions(ctx, profile), persistProfile: async () => undefined },
        async (session) => logout(session)
      ).catch(() => undefined);
    }
    const artifact = await deleteOwnedProfileArtifact(ctx.db, data.connectionId, data.userId);
    if (artifact) await ctx.storage.delete(artifact.objectKey);
    await updateConnectionState(ctx.db, {
      id: data.connectionId,
      userId: data.userId,
      state: "disconnected",
      refreshState: "idle",
    });
    await insertAudit(ctx.db, {
      userId: data.userId,
      actor: "user",
      action: "codex.profile.deleted",
      resourceType: "provider_connection",
      resourceId: data.connectionId,
    });
    return { status: "deleted" };
  });
};
