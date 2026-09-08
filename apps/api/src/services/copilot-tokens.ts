import type { CryptoService } from "../plugins/crypto.js";
import type { Db } from "@devgauge/database";
import { deleteEnvelope, upsertEnvelope } from "@devgauge/database";
import { ProviderError } from "@devgauge/provider-core";

export const COPILOT_ACCESS = "github-copilot:access";
export const COPILOT_REFRESH = "github-copilot:refresh";

interface EnvelopeRowLike {
  ciphertext: Uint8Array;
  wrappedDataKey: Uint8Array;
  keyVersion: number;
}

const envelopeToBuffer = (e: EnvelopeRowLike) => ({
  ciphertext: Buffer.from(e.ciphertext),
  wrappedDataKey: Buffer.from(e.wrappedDataKey),
  keyVersion: e.keyVersion,
});

export const storeCopilotToken = async (
  db: Db,
  crypto: CryptoService,
  connectionId: string,
  credentialType: string,
  value: string
): Promise<void> => {
  const envelope = crypto.seal(Buffer.from(value, "utf8"));
  await upsertEnvelope(db, {
    connectionId,
    credentialType,
    ciphertext: envelope.ciphertext,
    wrappedDataKey: envelope.wrappedDataKey,
    keyVersion: envelope.keyVersion,
  });
};

/** Type-scoped credential read (e.g. access or refresh token). */
export const readCopilotToken = async (
  db: Db,
  crypto: CryptoService,
  connectionId: string,
  credentialType: string
): Promise<string> => {
  const rows = await db`
    select ciphertext, wrapped_data_key, key_version
    from credential_envelopes
    where connection_id = ${connectionId} and credential_type = ${credentialType}
    limit 1
  `;
  const row = rows[0] as unknown as EnvelopeRowLike | undefined;
  if (!row) {
    throw new ProviderError("provider_unauthorized", "No GitHub token stored for this connection");
  }
  return crypto.open(envelopeToBuffer(row)).toString("utf8");
};

export const clearCopilotTokens = async (db: Db, connectionId: string): Promise<void> => {
  await deleteEnvelope(db, connectionId);
};