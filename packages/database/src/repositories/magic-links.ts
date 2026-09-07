import { createHash, randomInt } from "node:crypto";

import type { Db } from "../client.js";

export interface MagicLinkCodeRow {
  id: string;
  emailLower: string;
  codeHash: string;
  userId: string | null;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

/** 6-digit numeric code. */
export const generateMagicCode = (): string =>
  String(randomInt(0, 1_000_000)).padStart(6, "0");

export const hashMagicCode = (code: string): string =>
  createHash("sha256").update(code).digest("hex");

export const createMagicCode = async (
  db: Db,
  input: { emailLower: string; ttlMinutes: number }
): Promise<{ code: string; row: MagicLinkCodeRow }> => {
  const code = generateMagicCode();
  const rows = await db`
    insert into magic_link_codes (email_lower, code_hash, expires_at)
    values (${input.emailLower}, ${hashMagicCode(code)}, now() + make_interval(mins => ${input.ttlMinutes}))
    returning *
  `;
  return { code, row: rows[0] as unknown as MagicLinkCodeRow };
};

/**
 * Finds the latest unexpired, unconsumed code for an email and consumes it
 * atomically. Returns the code row or undefined.
 */
export const consumeMagicCode = async (
  db: Db,
  input: { emailLower: string; codeHash: string }
): Promise<MagicLinkCodeRow | undefined> => {
  const rows = await db`
    update magic_link_codes
    set consumed_at = now()
    where id = (
      select id from magic_link_codes
      where email_lower = ${input.emailLower}
        and code_hash = ${input.codeHash}
        and consumed_at is null
        and expires_at > now()
      order by created_at desc
      limit 1
    )
    returning *
  `;
  return rows[0] as unknown as MagicLinkCodeRow | undefined;
};