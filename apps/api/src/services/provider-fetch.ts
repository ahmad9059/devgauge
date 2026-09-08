import type { ProviderId, ProviderUsage } from "@devgauge/contracts";
import type { CryptoService } from "../plugins/crypto.js";
import type { ConnectionRow, Db } from "@devgauge/database";
import { ProviderError } from "@devgauge/provider-core";
import { fetchOpenCodeGoUsage } from "@devgauge/provider-opencode-go";
import { fetchCopilotQuota, quotaToUsage } from "@devgauge/provider-github-copilot";

import { fetchMockUsage } from "./mock-provider.js";
import { COPILOT_ACCESS, readCopilotToken } from "./copilot-tokens.js";

export interface ProviderFetcherContext {
  db: Db;
  crypto: CryptoService;
  mockTransport: boolean;
  copilotRuntimeMode: "sandbox" | "sdk";
}

/**
 * Resolves a normalized usage snapshot for a connection.
 *
 * OpenCode Go and GitHub Copilot use their real adapters when credentials are
 * stored and mock transport is off. Codex runs asynchronously in the isolated
 * worker; Claude Code snapshots arrive through the companion ingest route.
 */
export const fetchConnectionUsage = async (
  ctx: ProviderFetcherContext,
  connection: ConnectionRow
): Promise<ProviderUsage> => {
  const provider = connection.provider as ProviderId;

  if (!ctx.mockTransport) {
    if (provider === "opencode-go") {
      const envelope = await ctx.db`
        select ciphertext, wrapped_data_key, key_version
        from credential_envelopes
        where connection_id = ${connection.id}
        limit 1
      `;
      const row = envelope[0] as unknown as { ciphertext: Uint8Array; wrappedDataKey: Uint8Array; keyVersion: number } | undefined;
      if (!row) throw ProviderError.providerUnauthorized("No OpenCode Go credential stored for this connection");
      const apiKey = ctx.crypto.open({
        ciphertext: Buffer.from(row.ciphertext),
        wrappedDataKey: Buffer.from(row.wrappedDataKey),
        keyVersion: row.keyVersion,
      }).toString("utf8");
      const { diagnostics: _diagnostics, ...usage } = await fetchOpenCodeGoUsage({ apiKey });
      return usage;
    }

    if (provider === "github-copilot") {
      const accessToken = await readCopilotToken(ctx.db, ctx.crypto, connection.id, COPILOT_ACCESS);
      const quota = await fetchCopilotQuota({ accessToken, mode: ctx.copilotRuntimeMode });
      return quotaToUsage(quota, new Date());
    }
  }

  return fetchMockUsage(provider);
};
