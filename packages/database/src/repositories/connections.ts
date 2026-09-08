import type { Db } from "../client.js";

export interface ConnectionRow {
  id: string;
  userId: string;
  provider: string;
  plan: string | null;
  state: string;
  refreshState: string;
  adapterVersion: string | null;
  lastVerifiedAt: Date | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  lastErrorAt: Date | null;
  updatedAt: Date;
}

export const upsertConnection = async (
  db: Db,
  input: { userId: string; provider: string; plan?: string | null }
): Promise<ConnectionRow> => {
  const rows = await db`
    insert into provider_connections (user_id, provider, plan)
    values (${input.userId}, ${input.provider}, ${input.plan ?? null})
    on conflict (user_id, provider)
    do update set plan = excluded.plan, updated_at = now()
    returning *
  `;
  return rows[0] as unknown as ConnectionRow;
};

export const getConnection = async (
  db: Db,
  userId: string,
  provider: string
): Promise<ConnectionRow | undefined> => {
  const rows = await db`
    select * from provider_connections
    where user_id = ${userId} and provider = ${provider}
  `;
  return rows[0] as unknown as ConnectionRow | undefined;
};

/** Ownership-checked fetch by primary key. */
export const getOwnedConnection = async (
  db: Db,
  id: string,
  userId: string
): Promise<ConnectionRow | undefined> => {
  const rows = await db`
    select * from provider_connections
    where id = ${id} and user_id = ${userId}
  `;
  return rows[0] as unknown as ConnectionRow | undefined;
};

export const listConnectionsByUser = async (db: Db, userId: string): Promise<ConnectionRow[]> => {
  return db`
    select * from provider_connections
    where user_id = ${userId}
    order by provider
  `;
};

export const updateConnectionState = async (
  db: Db,
  input: {
    id: string;
    userId: string;
    state: string;
    refreshState: string;
    plan?: string | null;
    adapterVersion?: string | null;
    lastVerifiedAt?: Date | null;
    lastErrorCode?: string | null;
    lastErrorMessage?: string | null;
    lastErrorAt?: Date | null;
  }
): Promise<ConnectionRow | undefined> => {
  const rows = await db`
    update provider_connections
    set state = ${input.state},
        refresh_state = ${input.refreshState},
        plan = ${input.plan === undefined ? db`plan` : input.plan},
        adapter_version = ${input.adapterVersion === undefined ? db`adapter_version` : input.adapterVersion},
        last_verified_at = ${input.lastVerifiedAt === undefined ? db`last_verified_at` : input.lastVerifiedAt},
        last_error_code = ${input.lastErrorCode === undefined ? db`last_error_code` : input.lastErrorCode},
        last_error_message = ${input.lastErrorMessage === undefined ? db`last_error_message` : input.lastErrorMessage},
        last_error_at = ${input.lastErrorAt === undefined ? db`last_error_at` : input.lastErrorAt},
        updated_at = now()
    where id = ${input.id} and user_id = ${input.userId}
    returning *
  `;
  return rows[0] as unknown as ConnectionRow | undefined;
};
