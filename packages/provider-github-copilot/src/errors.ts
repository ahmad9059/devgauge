import { ProviderError } from "@devgauge/provider-core";

export const oauthError = (message: string): ProviderError =>
  new ProviderError("provider_unauthorized", `GitHub OAuth failed: ${message}`);

export const exchangeError = (raw: string): ProviderError =>
  new ProviderError("provider_unauthorized", `GitHub token exchange rejected${raw ? `: ${raw.slice(0, 200)}` : ""}`);

export const refreshError = (message: string): ProviderError =>
  new ProviderError("transient_upstream", `GitHub token refresh failed: ${message}`, { retryable: true });

export const quotaError = (message: string): ProviderError =>
  new ProviderError("contract_drift", `Copilot quota read failed: ${message}`);