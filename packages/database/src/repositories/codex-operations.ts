import type { Db } from "../client.js";

export type CodexLoginStatus = "queued" | "code_ready" | "connected" | "failed" | "cancelled" | "expired";

export interface CodexLoginAttemptRow {
  id: string;
  userId: string;
  connectionId: string;
  status: CodexLoginStatus;
  loginIdHash: string | null;
  verificationUrl: string | null;
  userCodeCiphertext: Uint8Array | null;
  userCodeWrappedDataKey: Uint8Array | null;
  userCodeKeyVersion: number | null;
  jobId: string | null;
  planType: string | null;
  errorCode: string | null;
  expiresAt: Date;
  completedAt: Date | null;
  cancelledAt: Date | null;
}

export const createCodexLoginAttempt = async (
  db: Db,
  input: { id: string; userId: string; connectionId: string; expiresAt: Date; jobId: string }
): Promise<CodexLoginAttemptRow> => {
  const rows = await db`
    insert into codex_login_attempts (id, user_id, connection_id, expires_at, job_id)
    values (${input.id}, ${input.userId}, ${input.connectionId}, ${input.expiresAt}, ${input.jobId})
    returning *
  `;
  return rows[0] as unknown as CodexLoginAttemptRow;
};

export const getOwnedCodexLoginAttempt = async (
  db: Db,
  id: string,
  userId: string
): Promise<CodexLoginAttemptRow | undefined> => {
  const rows = await db`select * from codex_login_attempts where id = ${id} and user_id = ${userId}`;
  return rows[0] as unknown as CodexLoginAttemptRow | undefined;
};

export const setCodexLoginCode = async (
  db: Db,
  input: {
    id: string;
    userId: string;
    loginIdHash: string;
    verificationUrl: string;
    ciphertext: Uint8Array;
    wrappedDataKey: Uint8Array;
    keyVersion: number;
  }
): Promise<boolean> => {
  const rows = await db`
    update codex_login_attempts
    set status = 'code_ready', login_id_hash = ${input.loginIdHash}, verification_url = ${input.verificationUrl},
        user_code_ciphertext = ${input.ciphertext}, user_code_wrapped_data_key = ${input.wrappedDataKey},
        user_code_key_version = ${input.keyVersion}, updated_at = now()
    where id = ${input.id} and user_id = ${input.userId} and status = 'queued' and expires_at > now()
    returning id
  `;
  return rows.length === 1;
};

export const finishCodexLoginAttempt = async (
  db: Db,
  input: { id: string; userId: string; status: "connected" | "failed" | "expired"; planType?: string; errorCode?: string }
): Promise<void> => {
  await db`
    update codex_login_attempts
    set status = ${input.status}, plan_type = ${input.planType ?? null}, error_code = ${input.errorCode ?? null},
        completed_at = now(), user_code_ciphertext = null, user_code_wrapped_data_key = null, updated_at = now()
    where id = ${input.id} and user_id = ${input.userId} and status in ('queued', 'code_ready')
  `;
};

export const cancelOwnedCodexLoginAttempt = async (db: Db, id: string, userId: string): Promise<boolean> => {
  const rows = await db`
    update codex_login_attempts
    set status = 'cancelled', cancelled_at = now(), user_code_ciphertext = null,
        user_code_wrapped_data_key = null, updated_at = now()
    where id = ${id} and user_id = ${userId} and status in ('queued', 'code_ready')
    returning id
  `;
  return rows.length === 1;
};

export const cancelActiveCodexLoginAttempts = async (
  db: Db,
  connectionId: string,
  userId: string
): Promise<void> => {
  await db`
    update codex_login_attempts
    set status = 'cancelled', cancelled_at = now(), user_code_ciphertext = null,
        user_code_wrapped_data_key = null, updated_at = now()
    where connection_id = ${connectionId} and user_id = ${userId} and status in ('queued', 'code_ready')
  `;
};

export type CodexResetOutcome = "reset" | "alreadyRedeemed" | "nothingToReset" | "noCredit";

export interface CodexResetAttemptRow {
  id: string;
  userId: string;
  connectionId: string;
  idempotencyKey: string;
  creditId: string | null;
  status: "queued" | "running" | "completed" | "failed";
  outcome: CodexResetOutcome | null;
  errorCode: string | null;
  createdAt: Date;
}

export const createCodexResetAttempt = async (
  db: Db,
  input: { userId: string; connectionId: string; idempotencyKey: string; creditId?: string; jobId: string }
): Promise<CodexResetAttemptRow> => {
  const rows = await db`
    insert into codex_reset_credit_attempts (
      user_id, connection_id, idempotency_key, credit_id, confirmed_at, job_id
    ) values (
      ${input.userId}, ${input.connectionId}, ${input.idempotencyKey}, ${input.creditId ?? null}, now(), ${input.jobId}
    )
    on conflict (connection_id, idempotency_key) do update set updated_at = now()
    returning *
  `;
  return rows[0] as unknown as CodexResetAttemptRow;
};

export const getOwnedCodexResetAttempt = async (
  db: Db,
  id: string,
  userId: string
): Promise<CodexResetAttemptRow | undefined> => {
  const rows = await db`select * from codex_reset_credit_attempts where id = ${id} and user_id = ${userId}`;
  return rows[0] as unknown as CodexResetAttemptRow | undefined;
};

export const getCodexResetAttemptByKey = async (
  db: Db,
  connectionId: string,
  userId: string,
  idempotencyKey: string
): Promise<CodexResetAttemptRow | undefined> => {
  const rows = await db`
    select * from codex_reset_credit_attempts
    where connection_id = ${connectionId} and user_id = ${userId} and idempotency_key = ${idempotencyKey}
  `;
  return rows[0] as unknown as CodexResetAttemptRow | undefined;
};

export const claimCodexResetAttempt = async (db: Db, id: string): Promise<CodexResetAttemptRow | undefined> => {
  const rows = await db`
    update codex_reset_credit_attempts
    set status = 'running', updated_at = now()
    where id = ${id} and status in ('queued', 'running')
    returning *
  `;
  return rows[0] as unknown as CodexResetAttemptRow | undefined;
};

export const finishCodexResetAttempt = async (
  db: Db,
  input: { id: string; status: "completed" | "failed"; outcome?: CodexResetOutcome; errorCode?: string }
): Promise<void> => {
  await db`
    update codex_reset_credit_attempts
    set status = ${input.status}, outcome = ${input.outcome ?? null}, error_code = ${input.errorCode ?? null},
        completed_at = now(), updated_at = now()
    where id = ${input.id}
  `;
};

export const countRecentCodexResetAttempts = async (db: Db, userId: string, since: Date): Promise<number> => {
  const rows = await db`
    select count(*)::int as count from codex_reset_credit_attempts
    where user_id = ${userId} and created_at >= ${since}
  `;
  return (rows[0] as unknown as { count: number }).count;
};
