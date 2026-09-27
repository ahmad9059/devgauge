import type { Database } from '@/storage/database';
import type { ProviderId } from '@/domain/providers';
import type { ProviderConnection } from '@/storage/types';

type ConnectionRow = {
  id: string;
  provider_id: string;
  account_scope: string;
  external_account_id: string | null;
  canonical_account_key: string;
  display_name: string | null;
  account_hint: string | null;
  auth_mode: string;
  credential_ref: string | null;
  status: string;
  connected_at: string | null;
  disconnected_at: string | null;
  last_success_at: string | null;
  last_attempt_at: string | null;
  next_allowed_refresh_at: string | null;
  created_at: string;
  updated_at: string;
};

function toConnection(row: ConnectionRow): ProviderConnection {
  return {
    id: row.id,
    providerId: row.provider_id as ProviderId,
    accountScope: row.account_scope as ProviderConnection['accountScope'],
    externalAccountId: row.external_account_id,
    canonicalAccountKey: row.canonical_account_key,
    displayName: row.display_name,
    accountHint: row.account_hint,
    authMode: row.auth_mode as ProviderConnection['authMode'],
    credentialRef: row.credential_ref,
    status: row.status as ProviderConnection['status'],
    connectedAt: row.connected_at,
    disconnectedAt: row.disconnected_at,
    lastSuccessAt: row.last_success_at,
    lastAttemptAt: row.last_attempt_at,
    nextAllowedRefreshAt: row.next_allowed_refresh_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const COLUMNS = `id, provider_id, account_scope, external_account_id,
  canonical_account_key, display_name, account_hint, auth_mode, credential_ref,
  status, connected_at, disconnected_at, last_success_at, last_attempt_at,
  next_allowed_refresh_at, created_at, updated_at`;

export async function listConnections(
  db: Database,
): Promise<ProviderConnection[]> {
  const rows = await db.all<ConnectionRow>(
    `SELECT ${COLUMNS} FROM provider_connections ORDER BY created_at ASC, id ASC`,
  );
  return rows.map(toConnection);
}

export async function getConnection(
  db: Database,
  id: string,
): Promise<ProviderConnection | null> {
  const row = await db.first<ConnectionRow>(
    `SELECT ${COLUMNS} FROM provider_connections WHERE id = ?`,
    [id],
  );
  return row ? toConnection(row) : null;
}

/**
 * Inserts or updates by id. A conflicting canonical account row for the same
 * provider/scope (for example a reserved pending key) is replaced in the same
 * transaction so duplicate identity rows cannot accumulate.
 */
export async function upsertConnection(
  db: Database,
  connection: ProviderConnection,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.run(
      `DELETE FROM provider_connections
       WHERE provider_id = ? AND account_scope = ? AND canonical_account_key = ?
         AND id <> ?`,
      [
        connection.providerId,
        connection.accountScope,
        connection.canonicalAccountKey,
        connection.id,
      ],
    );
    await tx.run(
      `INSERT INTO provider_connections (${COLUMNS})
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
         provider_id = excluded.provider_id,
         account_scope = excluded.account_scope,
         external_account_id = excluded.external_account_id,
         canonical_account_key = excluded.canonical_account_key,
         display_name = excluded.display_name,
         account_hint = excluded.account_hint,
         auth_mode = excluded.auth_mode,
         credential_ref = excluded.credential_ref,
         status = excluded.status,
         connected_at = excluded.connected_at,
         disconnected_at = excluded.disconnected_at,
         last_success_at = excluded.last_success_at,
         last_attempt_at = excluded.last_attempt_at,
         next_allowed_refresh_at = excluded.next_allowed_refresh_at,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at`,
      [
        connection.id,
        connection.providerId,
        connection.accountScope,
        connection.externalAccountId,
        connection.canonicalAccountKey,
        connection.displayName,
        connection.accountHint,
        connection.authMode,
        connection.credentialRef,
        connection.status,
        connection.connectedAt,
        connection.disconnectedAt,
        connection.lastSuccessAt,
        connection.lastAttemptAt,
        connection.nextAllowedRefreshAt,
        connection.createdAt,
        connection.updatedAt,
      ],
    );
  });
}

export async function markConnectionDisconnected(
  db: Database,
  id: string,
  at: string,
): Promise<void> {
  await db.run(
    `UPDATE provider_connections
     SET status = 'disconnected', disconnected_at = ?, updated_at = ?
     WHERE id = ?`,
    [at, at, id],
  );
}

export async function deleteConnection(
  db: Database,
  id: string,
): Promise<void> {
  await db.run('DELETE FROM provider_connections WHERE id = ?', [id]);
}

export async function listConnectionIds(db: Database): Promise<string[]> {
  const rows = await db.all<{ id: string }>(
    'SELECT id FROM provider_connections ORDER BY created_at ASC, id ASC',
  );
  return rows.map((row) => row.id);
}
