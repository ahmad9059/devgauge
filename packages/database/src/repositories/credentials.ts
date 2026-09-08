import type { Db } from "../client.js";

export interface EnvelopeRow {
  id: string;
  connectionId: string;
  credentialType: string;
  ciphertext: Uint8Array;
  wrappedDataKey: Uint8Array;
  keyVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export const upsertEnvelope = async (
  db: Db,
  input: {
    connectionId: string;
    credentialType: string;
    ciphertext: Uint8Array;
    wrappedDataKey: Uint8Array;
    keyVersion: number;
  }
): Promise<EnvelopeRow> => {
  const rows = await db`
    insert into credential_envelopes (connection_id, credential_type, ciphertext, wrapped_data_key, key_version)
    values (${input.connectionId}, ${input.credentialType}, ${input.ciphertext}, ${input.wrappedDataKey}, ${input.keyVersion})
    on conflict (connection_id, credential_type)
    do update set ciphertext = excluded.ciphertext,
                  wrapped_data_key = excluded.wrapped_data_key,
                  key_version = excluded.key_version,
                  updated_at = now()
    returning *
  `;
  return rows[0] as unknown as EnvelopeRow;
};

export const findEnvelopeByConnection = async (
  db: Db,
  connectionId: string,
  credentialType?: string
): Promise<EnvelopeRow | undefined> => {
  const rows = await db`
    select * from credential_envelopes
    where connection_id = ${connectionId}
      ${credentialType ? db`and credential_type = ${credentialType}` : db``}
    order by updated_at desc
    limit 1
  `;
  return rows[0] as unknown as EnvelopeRow | undefined;
};

export const deleteEnvelope = async (db: Db, connectionId: string): Promise<void> => {
  await db`delete from credential_envelopes where connection_id = ${connectionId}`;
};
