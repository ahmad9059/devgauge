import { createHash } from "node:crypto";

import type { Db } from "../client.js";

export type TombstoneKind = "user" | "credential" | "connection";

/** Deterministic pseudonymous hash of a subject identifier. */
export const subjectHash = (value: string): string =>
  createHash("sha256").update(value).digest("hex").slice(0, 32);

export const insertTombstone = async (
  db: Db,
  kind: TombstoneKind,
  value: string
): Promise<void> => {
  await db`
    insert into deletion_ledger (subject_kind, subject_hash)
    values (${kind}, ${subjectHash(value)})
    on conflict do nothing
  `;
};

export const isTombstoned = async (db: Db, kind: TombstoneKind, value: string): Promise<boolean> => {
  const rows = await db`
    select 1 from deletion_ledger where subject_kind = ${kind} and subject_hash = ${subjectHash(value)}
  `;
  return rows.length > 0;
};

/** Retention job: purges tombstones older than 30 days. Returns count removed. */
export const purgeExpiredTombstones = async (db: Db): Promise<number> => {
  const rows = await db`
    delete from deletion_ledger where expires_at < now()
    returning id
  `;
  return rows.length;
};