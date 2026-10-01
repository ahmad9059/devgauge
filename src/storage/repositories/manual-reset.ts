import type { SqlDriver } from '@/storage/sqlite-driver';
import type { ManualResetEntry } from '@/storage/types';

type Row = {
  id: string;
  provider_id: string;
  label: string;
  resets_at: string;
  source_note: string | null;
  created_at: string;
  updated_at: string;
};

function toEntry(row: Row): ManualResetEntry {
  return {
    id: row.id,
    providerId: row.provider_id as ManualResetEntry['providerId'],
    label: row.label,
    resetsAt: row.resets_at,
    sourceNote: row.source_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const COLUMNS = `id, provider_id, label, resets_at, source_note, created_at, updated_at`;

export async function listManualResetEntries(
  db: SqlDriver,
): Promise<ManualResetEntry[]> {
  const rows = await db.all<Row>(
    `SELECT ${COLUMNS} FROM manual_reset_entries ORDER BY resets_at ASC, id ASC`,
  );
  return rows.map(toEntry);
}

export async function listManualResetEntriesForProvider(
  db: SqlDriver,
  providerId: 'claude' | 'codex',
): Promise<ManualResetEntry[]> {
  const rows = await db.all<Row>(
    `SELECT ${COLUMNS} FROM manual_reset_entries
     WHERE provider_id = ? ORDER BY resets_at ASC, id ASC`,
    [providerId],
  );
  return rows.map(toEntry);
}

export async function upsertManualResetEntry(
  db: SqlDriver,
  entry: ManualResetEntry,
): Promise<void> {
  await db.run(
    `INSERT INTO manual_reset_entries (${COLUMNS}) VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET
       provider_id = excluded.provider_id, label = excluded.label,
       resets_at = excluded.resets_at, source_note = excluded.source_note,
       created_at = excluded.created_at, updated_at = excluded.updated_at`,
    [
      entry.id,
      entry.providerId,
      entry.label,
      entry.resetsAt,
      entry.sourceNote,
      entry.createdAt,
      entry.updatedAt,
    ],
  );
}

export async function deleteManualResetEntry(
  db: SqlDriver,
  id: string,
): Promise<void> {
  await db.run('DELETE FROM manual_reset_entries WHERE id = ?', [id]);
}
