import type { Db } from "../client.js";

export interface CompanionDeviceRow {
  id: string;
  userId: string;
  deviceLabel: string | null;
  credentialHash: string;
  lastSeenAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export const registerCompanionDevice = async (
  db: Db,
  input: { userId: string; deviceLabel: string | null; credentialHash: string }
): Promise<CompanionDeviceRow> => {
  const rows = await db`
    insert into companion_devices (user_id, device_label, credential_hash)
    values (${input.userId}, ${input.deviceLabel}, ${input.credentialHash})
    returning *
  `;
  return rows[0] as unknown as CompanionDeviceRow;
};

export const findActiveCompanionByCredential = async (
  db: Db,
  credentialHash: string
): Promise<CompanionDeviceRow | undefined> => {
  const rows = await db`
    select * from companion_devices
    where credential_hash = ${credentialHash} and revoked_at is null
  `;
  return rows[0] as unknown as CompanionDeviceRow | undefined;
};

export const touchCompanionDevice = async (db: Db, deviceId: string): Promise<void> => {
  await db`update companion_devices set last_seen_at = now() where id = ${deviceId}`;
};

export const listCompanionDevicesByUser = async (db: Db, userId: string): Promise<CompanionDeviceRow[]> => {
  return db`select * from companion_devices where user_id = ${userId} order by created_at`;
};

export const revokeCompanionDevice = async (db: Db, deviceId: string, userId: string): Promise<void> => {
  await db`update companion_devices set revoked_at = now() where id = ${deviceId} and user_id = ${userId}`;
};