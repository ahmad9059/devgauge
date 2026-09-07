import { createHash } from "node:crypto";

import type { ProviderConnection } from "@devgauge/contracts";

import type { ConnectionRow } from "@devgauge/database";

export const toConnectionDto = (row: ConnectionRow): ProviderConnection => ({
  provider: row.provider as ProviderConnection["provider"],
  state: row.state as ProviderConnection["state"],
  refresh: row.refreshState as ProviderConnection["refresh"],
  plan: row.plan,
  adapterVersion: row.adapterVersion ?? "unknown",
  lastVerifiedAt: row.lastVerifiedAt ? row.lastVerifiedAt.toISOString() : null,
  lastError: row.lastErrorCode
    ? {
        code: row.lastErrorCode as NonNullable<ProviderConnection["lastError"]>["code"],
        message: row.lastErrorMessage ?? "Unknown provider error",
        occurredAt: (row.lastErrorAt ?? new Date()).toISOString(),
        retryable: false,
      }
    : null,
  updatedAt: row.updatedAt.toISOString(),
});

export const contentHashOf = (value: unknown): string =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 32);