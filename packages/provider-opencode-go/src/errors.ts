import { ProviderError } from "@devgauge/provider-core";

import { openCodeGoErrorSchema } from "./schema.js";

const transient = (): ProviderError =>
  ProviderError.transientUpstream("OpenCode Go usage endpoint unavailable");

const providerUnauthorized = (message: string): ProviderError =>
  ProviderError.providerUnauthorized(message || "OpenCode Go API key rejected");

const entitlementRequired = (): ProviderError =>
  ProviderError.entitlementRequired("OpenCode Go subscription required.");

const contractDrift = (message: string): ProviderError =>
  ProviderError.contractDrift(`Unexpected OpenCode Go response: ${message}`);

/** Classifies a non-2xx HTTP status + body into a typed provider error. */
export const classifyResponseError = (raw: string, status: number): ProviderError => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return status >= 500 ? transient() : providerUnauthorized(raw.slice(0, 200));
  }

  const parsedError = openCodeGoErrorSchema.safeParse(parsed);
  if (parsedError.success) {
    const { type, message } = parsedError.data.error;
    if (type === "AuthError") return providerUnauthorized(message);
    if (type === "EntitlementError") return entitlementRequired();
    return providerUnauthorized(message);
  }

  if (status === 403) return entitlementRequired();
  if (status === 429) return transient();
  if (status >= 500) return transient();
  return contractDrift(`HTTP ${status}`);
};

/** Treats a malformed 2xx body as contract drift (preserve last-known-good). */
export const malformedSuccess = (detail: string): ProviderError => contractDrift(detail);