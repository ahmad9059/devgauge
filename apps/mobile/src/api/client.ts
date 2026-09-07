import type { ProviderUsage } from "@devgauge/contracts";

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
};