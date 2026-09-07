import type { CryptoService } from "../plugins/crypto.js";
import type { Db } from "@devgauge/database";
import {
  deleteEnvelope,
  getConnection,
  insertAudit,
  insertTombstone,
  upsertConnection,
  upsertEnvelope,
} from "@devgauge/database";

export interface ConnectInput {
  provider: string;
  credential: string;
  credentialType: string;
}

export const connectConnection = async (
  db: Db,
  crypto: CryptoService,
  input: { userId: string; provider: string; credential: string; credentialType: string }
): Promise<void> => {
  const connection = await upsertConnection(db, { userId: input.userId, provider: input.provider });
  const envelope = crypto.seal(Buffer.from(input.credential, "utf8"));
  await upsertEnvelope(db, {
    connectionId: connection.id,
    credentialType: input.credentialType,
    ciphertext: envelope.ciphertext,
    wrappedDataKey: envelope.wrappedDataKey,
    keyVersion: envelope.keyVersion,
  });
  await insertAudit(db, {
    userId: input.userId,
    actor: "user",
    action: "connection.connect",
    resourceType: "provider_connection",
    resourceId: connection.id,
  });
};

export const disconnectConnection = async (
  db: Db,
  input: { userId: string; provider: string }
): Promise<void> => {
  const connection = await getConnection(db, input.userId, input.provider);
  if (!connection) return;
  await deleteEnvelope(db, connection.id);
  await insertTombstone(db, "credential", `${input.userId}:${input.provider}`);
  await insertAudit(db, {
    userId: input.userId,
    actor: "user",
    action: "connection.disconnect",
    resourceType: "provider_connection",
    resourceId: connection.id,
  });
};