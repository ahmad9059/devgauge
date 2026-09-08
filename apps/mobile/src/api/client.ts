import type {
  AlertEvent,
  AlertRule,
  AlertRuleInput,
  HistoryResolution,
  HistorySeriesResponse,
  ProviderConnection,
  ProviderId,
  ProviderUsage,
} from "@devgauge/contracts";

import { getSessionToken } from "../storage/secure";

const DEFAULT_BASE_URL = "http://localhost:3000";

export const apiBaseUrl = (): string => process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_BASE_URL;

export interface SessionResponse {
  token: string;
  expiresAt: string;
}

export interface UsageReadResponse {
  revision: string;
  serverTime: string;
  providers: ProviderUsage[];
  stale: boolean;
}

export interface CodexLoginAttempt {
  attemptId: string;
  status: "queued" | "code_ready" | "connected" | "failed" | "cancelled" | "expired";
  verificationUrl?: string | null;
  userCode?: string | null;
  expiresAt: string;
  plan?: string | null;
  errorCode?: string | null;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

/** Retry once on transient 5xx / network failure, honoring a short backoff. */
const withRetry = async <T>(fn: () => Promise<T>, attempts = 2): Promise<T> => {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 400));
    }
  }
  throw lastError;
};

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  return withRetry(async () => {
    const token = await getSessionToken();
    const headers: Record<string, string> = {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> | undefined),
    };

    let response: Response;
    try {
      response = await fetch(`${apiBaseUrl()}${path}`, { ...options, headers });
    } catch {
      throw new ApiError(0, "transient_upstream", "Network request failed");
    }

    const body = (await response.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
    if (!response.ok) {
      throw new ApiError(
        response.status,
        body.error?.code ?? "internal",
        body.error?.message ?? `Request failed (${response.status})`
      );
    }
    return body as T;
  });
};

export const api = {
  magicLinkRequest: (email: string): Promise<{ ok: boolean; code?: string }> =>
    request("/v1/auth/magic-link/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  magicLinkVerify: (email: string, code: string): Promise<SessionResponse> =>
    request("/v1/auth/magic-link/verify", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    }),

  logout: (): Promise<{ ok: boolean }> =>
    request("/v1/auth/logout", { method: "POST" }),

  me: (): Promise<{ id: string; email: string }> => request("/v1/me"),

  usage: (): Promise<UsageReadResponse> => request("/v1/usage"),
  providerUsage: (provider: string): Promise<ProviderUsage> => request(`/v1/usage/${provider}`),
  connections: (): Promise<{ connections: ProviderConnection[] }> => request("/v1/connections"),
  connectProvider: (provider: string, credential?: string): Promise<{ connection: ProviderConnection }> =>
    request(`/v1/connections/${provider}/connect`, {
      method: "POST",
      body: JSON.stringify(credential ? { credential } : {}),
    }),
  disconnectProvider: (provider: string): Promise<{ connection: ProviderConnection }> =>
    request(`/v1/connections/${provider}/disconnect`, { method: "POST" }),
  disconnectCodex: (): Promise<{ connection: ProviderConnection }> =>
    request("/v1/connections/codex/disconnect", { method: "POST" }),

  startCodexLogin: (resumeAttemptId?: string): Promise<CodexLoginAttempt> =>
    request("/v1/connections/codex/device-login", {
      method: "POST",
      body: JSON.stringify(resumeAttemptId ? { resumeAttemptId } : {}),
    }),
  codexLoginStatus: (attemptId: string): Promise<CodexLoginAttempt> =>
    request(`/v1/connections/codex/device-login/${attemptId}`),
  cancelCodexLogin: (attemptId: string): Promise<{ cancelled: boolean }> =>
    request(`/v1/connections/codex/device-login/${attemptId}/cancel`, { method: "POST" }),
  consumeCodexResetCredit: (idempotencyKey: string, creditId?: string): Promise<{ attemptId: string; status: string }> =>
    request("/v1/connections/codex/reset-credit", {
      method: "POST",
      body: JSON.stringify({ confirmed: true, idempotencyKey, ...(creditId ? { creditId } : {}) }),
    }),
  codexResetCreditStatus: (attemptId: string): Promise<{
    attemptId: string;
    status: "queued" | "running" | "completed" | "failed";
    outcome: "reset" | "alreadyRedeemed" | "nothingToReset" | "noCredit" | null;
    errorCode: string | null;
  }> => request(`/v1/connections/codex/reset-credit/${attemptId}`),

  providerRefresh: (provider: string): Promise<{ status: string; jobId: string | null }> =>
    request(`/v1/usage/${provider}/refresh`, { method: "POST" }),

  historySeries: (query: {
    provider: ProviderId;
    windowId?: string;
    resolution: HistoryResolution;
    from: string;
    to: string;
    cursor?: string;
    limit?: number;
  }): Promise<HistorySeriesResponse> => {
    const params = new URLSearchParams({
      resolution: query.resolution,
      from: query.from,
      to: query.to,
      limit: String(query.limit ?? 100),
    });
    if (query.windowId) params.set("windowId", query.windowId);
    if (query.cursor) params.set("cursor", query.cursor);
    return request(`/v1/history/${query.provider}?${params.toString()}`);
  },

  alerts: (): Promise<{ alerts: AlertRule[] }> => request("/v1/alerts"),
  createAlert: (input: AlertRuleInput): Promise<AlertRule> =>
    request("/v1/alerts", { method: "POST", body: JSON.stringify(input) }),
  updateAlert: (id: string, input: AlertRuleInput): Promise<AlertRule> =>
    request(`/v1/alerts/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  deleteAlert: (id: string): Promise<{ ok: boolean }> =>
    request(`/v1/alerts/${id}`, { method: "DELETE" }),
  alertEvents: (): Promise<{ events: AlertEvent[] }> => request("/v1/alert-events"),
  acknowledgeAlertEvent: (id: string): Promise<{ ok: boolean }> =>
    request(`/v1/alert-events/${id}/acknowledge`, { method: "POST" }),

  dataExportUrl: (provider: string, format: "csv" | "json"): string =>
    `${apiBaseUrl()}/v1/data/export?provider=${provider}&format=${format}`,
  deleteHistory: (provider?: string): Promise<{ ok: boolean; deletedSnapshots: number }> =>
    request("/v1/data/history", { method: "DELETE", body: JSON.stringify({ confirmed: true, ...(provider ? { provider } : {}) }) }),

  deleteAccount: (): Promise<{ ok: boolean; pending?: boolean }> =>
    request("/v1/me", { method: "DELETE" }),

  companionDevices: (): Promise<{ devices: { id: string; label: string; lastSeenAt: string; revokedAt: string | null }[] }> =>
    request("/v1/companion/devices"),
  revokeCompanionDevice: (deviceId: string): Promise<{ ok: boolean }> =>
    request(`/v1/companion/devices/${deviceId}/revoke`, { method: "POST" }),
};
