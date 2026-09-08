import type { ProviderUsage } from "@devgauge/contracts";
import { ProviderError } from "@devgauge/provider-core";

import { normalizeQuota } from "./normalize.js";
import type { CopilotQuota } from "./schema.js";

export type QuotaRuntimeMode = "sandbox" | "sdk";

export interface QuotaFetchOptions {
  accessToken: string;
  mode: QuotaRuntimeMode;
  now?: () => Date;
}

/** Builds a normalized ProviderUsage from a raw Copilot quota snapshot. */
export const quotaToUsage = (quota: CopilotQuota, now: Date): ProviderUsage => {
  const { windows } = normalizeQuota(quota);
  return {
    provider: "github-copilot",
    plan: "copilot",
    windows,
    fetchedAt: now.toISOString(),
    source: "official-api",
    stale: false,
  };
};

const fetchSdkQuota = async (accessToken: string): Promise<CopilotQuota> => {
  try {
    // Lazily load the pinned runtime; typed via the ambient declaration in
    // copilot-sdk.d.ts. Installed in the worker image at Phase 10.
    const sdk = (await import("@github/copilot-sdk")) as unknown as {
      CopilotClient: new (opts: { gitHubToken: string; useLoggedInUser: boolean }) => {
        rpc: { account: { getQuota(_: Record<string, never>): Promise<{ quotaSnapshots: Record<string, unknown> }> } };
      };
    };
    const client = new sdk.CopilotClient({ gitHubToken: accessToken, useLoggedInUser: false });
    const { quotaSnapshots } = await client.rpc.account.getQuota({});
    return { quotaSnapshots } as CopilotQuota;
  } catch (error) {
    throw new ProviderError(
      "contract_drift",
      `Copilot SDK runtime unavailable: ${error instanceof Error ? error.message : "unknown"}`,
      { retryable: true }
    );
  }
};

const fetchSandboxQuota = async (): Promise<CopilotQuota> => {
  // Deterministic sandbox snapshot proving the dynamic-bucket path.
  const used = 430 + (Math.floor(Date.now() / 60_000) % 30);
  return {
    quotaSnapshots: {
      premium_interactions: {
        entitlementRequests: 1000,
        usedRequests: used,
        remainingPercentage: Math.max(0, 100 - Math.floor((used / 1000) * 100)),
        resetDate: new Date(Date.now() + 24 * 3_600_000).toISOString(),
      },
      some_future_bucket: { entitlementRequests: -1, usedRequests: 120, remainingPercentage: null, resetDate: null },
    },
  };
};

/**
 * Fetches Copilot quota. In `sdk` mode the pinned runtime is required; in
 * `sandbox` mode a fixture is returned so the full persist path is exercised
 * without a real seat/runtime. The access token is never returned or logged.
 */
export const fetchCopilotQuota = async (options: QuotaFetchOptions): Promise<CopilotQuota> => {
  if (options.mode === "sdk") return fetchSdkQuota(options.accessToken);
  return fetchSandboxQuota();
};