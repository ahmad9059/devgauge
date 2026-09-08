import { ProviderError } from "@devgauge/provider-core";

import type { CodexSession } from "./session.js";
import {
  consumeResetCreditResultSchema,
  deviceCodeLoginResultSchema,
  loginStatusSchema,
  rateLimitsReadResultSchema,
  rateLimitsUpdatedNotificationSchema,
  usageReadResultSchema,
  type ConsumeCreditOutcome,
  type DeviceCodeLoginResult,
  type RateLimitsResult,
  type UsageResult,
} from "./schema.js";

const parseResult = <T>(
  value: unknown,
  schema: { safeParse(input: unknown): { success: true; data: T } | { success: false } },
  method: string
): T => {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw ProviderError.contractDrift(`Codex App Server returned malformed data for ${method}`);
  }
  return parsed.data;
};

export interface LoginStatus {
  loginId: string;
  success: boolean;
  error: string | null;
}

export interface CodexRefreshResult {
  rateLimits: RateLimitsResult;
  usage: UsageResult | null;
  activityError: Error | null;
}

export const startDeviceCodeLogin = async (session: CodexSession): Promise<DeviceCodeLoginResult> =>
  parseResult(
    await session.request("account/login/start", { type: "chatgptDeviceCode" }),
    deviceCodeLoginResultSchema,
    "account/login/start"
  );

export const awaitLoginCompletion = (
  session: CodexSession,
  loginId: string,
  timeoutMs = 120_000
): Promise<LoginStatus> =>
  new Promise((resolve, reject) => {
    let unsubscribe = (): void => undefined;
    let unsubscribeClose = (): void => undefined;
    const cleanup = (): void => {
      unsubscribe();
      unsubscribeClose();
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(ProviderError.transientUpstream("Codex device login timed out"));
    }, timeoutMs);
    unsubscribe = session.onNotification("account/login/completed", (params) => {
      const parsed = loginStatusSchema.safeParse(params);
      if (!parsed.success || parsed.data.loginId !== loginId) return;
      clearTimeout(timer);
      cleanup();
      resolve({
        loginId: parsed.data.loginId,
        success: parsed.data.success,
        error: parsed.data.error ?? null,
      });
    });
    unsubscribeClose = session.onClosed((error) => {
      clearTimeout(timer);
      cleanup();
      reject(error);
    });
  });

export const cancelLogin = async (session: CodexSession, loginId: string): Promise<void> => {
  await session.request("account/login/cancel", { loginId });
};

export const logout = async (session: CodexSession): Promise<void> => {
  await session.request("account/logout");
};

export const readRateLimits = async (session: CodexSession): Promise<RateLimitsResult> =>
  parseResult(
    await session.request("account/rateLimits/read"),
    rateLimitsReadResultSchema,
    "account/rateLimits/read"
  );

export const readUsage = async (session: CodexSession): Promise<UsageResult> =>
  parseResult(
    await session.request("account/usage/read", {}),
    usageReadResultSchema,
    "account/usage/read"
  );

export const onRateLimitsUpdated = (
  session: CodexSession,
  handler: (rateLimits: RateLimitsResult["rateLimits"]) => void
): (() => void) => session.onNotification("account/rateLimits/updated", (params) => {
  const parsed = rateLimitsUpdatedNotificationSchema.safeParse(params);
  if (parsed.success) handler(parsed.data.rateLimits);
});

/** A valid quota read succeeds even when the optional activity read fails. */
export const refreshCodexUsage = async (session: CodexSession): Promise<CodexRefreshResult> => {
  const rateLimits = await readRateLimits(session);
  try {
    return { rateLimits, usage: await readUsage(session), activityError: null };
  } catch (error) {
    return {
      rateLimits,
      usage: null,
      activityError: error instanceof Error ? error : new Error("Codex activity read failed"),
    };
  }
};

export const consumeResetCredit = async (
  session: CodexSession,
  idempotencyKey: string,
  creditId?: string
): Promise<ConsumeCreditOutcome> => {
  if (!idempotencyKey) throw new TypeError("idempotencyKey is required");
  const params = creditId ? { idempotencyKey, creditId } : { idempotencyKey };
  return parseResult(
    await session.request("account/rateLimitResetCredit/consume", params),
    consumeResetCreditResultSchema,
    "account/rateLimitResetCredit/consume"
  ).outcome;
};

/** A successful/idempotent consume is incomplete until limits are refetched. */
export const consumeResetCreditAndRefresh = async (
  session: CodexSession,
  idempotencyKey: string,
  creditId?: string
): Promise<{ outcome: ConsumeCreditOutcome; rateLimits: RateLimitsResult }> => {
  const outcome = await consumeResetCredit(session, idempotencyKey, creditId);
  const rateLimits = await readRateLimits(session);
  return { outcome, rateLimits };
};
