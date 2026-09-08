import { createHash } from "node:crypto";

import type { Db } from "../client.js";

export interface PairingCodeRow {
  id: string;
  codeHash: string;
  userId: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

export const hashPairingCode = (code: string): string => createHash("sha256").update(code).digest("hex");

export const createPairingCode = async (
  db: Db,
  input: { userId: string; codeHash: string; ttlMinutes: number }
): Promise<void> => {
  const expiresAt = new Date(Date.now() + input.ttlMinutes * 60_000);
  await db`
    insert into pairing_codes (user_id, code_hash, expires_at)
    values (${input.userId}, ${input.codeHash}, ${expiresAt})
  `;
};

/** Atomically consumes a pairing code, returning the owning user id. */
export const consumePairingCode = async (
  db: Db,
  codeHash: string
): Promise<{ userId: string } | undefined> => {
  const rows = await db`
    update pairing_codes
    set consumed_at = now()
    where id = (
      select id from pairing_codes
      where code_hash = ${codeHash}
        and consumed_at is null
        and expires_at > now()
      order by created_at desc
      limit 1
    )
    returning user_id
  `;
  const row = rows[0] as unknown as { userId: string } | undefined;
  return row;
};