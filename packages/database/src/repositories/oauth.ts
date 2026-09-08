import type { Db } from "../client.js";

export interface OauthTransactionRow {
  id: string;
  userId: string;
  provider: string;
  stateHash: string;
  pkceVerifierHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

export const createOauthTransaction = async (
  db: Db,
  input: { userId: string; provider: string; stateHash: string; pkceVerifierHash: string; ttlMinutes: number }
): Promise<OauthTransactionRow> => {
  const expiresAt = new Date(Date.now() + input.ttlMinutes * 60_000);
  const rows = await db`
    insert into oauth_transactions (user_id, provider, state_hash, pkce_verifier_hash, expires_at)
    values (${input.userId}, ${input.provider}, ${input.stateHash}, ${input.pkceVerifierHash}, ${expiresAt})
    returning *
  `;
  return rows[0] as unknown as OauthTransactionRow;
};

/**
 * Atomically finds and consumes a transaction by state hash. Returns the row
 * only when it is unexpired, unconsumed, and owned by the requesting user.
 */
export const consumeOauthTransaction = async (
  db: Db,
  input: { userId: string; stateHash: string }
): Promise<OauthTransactionRow | undefined> => {
  const rows = await db`
    update oauth_transactions
    set consumed_at = now()
    where id = (
      select id from oauth_transactions
      where user_id = ${input.userId}
        and state_hash = ${input.stateHash}
        and consumed_at is null
        and expires_at > now()
      order by created_at desc
      limit 1
    )
    returning *
  `;
  return rows[0] as unknown as OauthTransactionRow | undefined;
};