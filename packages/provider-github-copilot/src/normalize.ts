import { createHash, randomBytes } from "node:crypto";

import type { UsageWindow } from "@devgauge/contracts";
import { normalizeWindow } from "@devgauge/provider-core";

import type { CopilotQuota } from "./schema.js";

export const KNOWN_BUCKET_LABELS: Record<string, string> = {
  premium_interactions: "Premium interactions",
};

export const humanizeWindowId = (id: string): string =>
  id
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export interface CopilotNormalized {
  windows: UsageWindow[];
  /** Upstream originals retained for restricted telemetry. */
  diagnostics: Array<{ bucketId: string; upstream: CopilotQuota["quotaSnapshots"][string] }>;
}

/**
 * Normalizes every runtime quota bucket without discarding unknown IDs.
 * `entitlementRequests === -1` means unlimited → no used percent computed.
 */
export const normalizeQuota = (quota: CopilotQuota): CopilotNormalized => {
  const windows: UsageWindow[] = [];
  const diagnostics: CopilotNormalized["diagnostics"] = [];

  for (const [bucketId, snapshot] of Object.entries(quota.quotaSnapshots ?? {})) {
    diagnostics.push({ bucketId, upstream: snapshot });
    if (!snapshot) continue;

    const unlimited = snapshot.entitlementRequests === -1;
    const usedPercent = unlimited ? null : snapshot.remainingPercentage === null ? null : Math.max(0, 100 - snapshot.remainingPercentage);

    windows.push(
      normalizeWindow({
        id: bucketId,
        label: KNOWN_BUCKET_LABELS[bucketId] ?? humanizeWindowId(bucketId),
        usedPercent,
        used: snapshot.usedRequests,
        limit: snapshot.entitlementRequests === -1 ? null : snapshot.entitlementRequests,
        unit: "requests",
        windowSeconds: null,
        resetsAt: snapshot.resetDate,
      })
    );
  }
  return { windows, diagnostics };
};

export const randomState = (): string => randomBytes(24).toString("base64url");
export const randomPkceVerifier = (): string => randomBytes(32).toString("base64url");
export const pkceChallenge = (verifier: string): string =>
  createHash("sha256").update(verifier).digest("base64url");
export const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");