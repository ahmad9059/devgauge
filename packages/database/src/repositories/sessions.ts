import { createHash, randomBytes } from "node:crypto";

import type { Db } from "../client.js";
import type { UserRow } from "./users.js";

export interface SessionRow {
  id: string;
  userId: string;
  tokenHash: string;
  deviceInstallationId: string | null;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface SessionWithUser {
  session: SessionRow;
  user: UserRow;
}

/** Opaque session token (never stored in plaintext). */
export const generateSessionToken = (): string => randomBytes(32).toString("base64url");

export const hashToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

export const createSession = async (
  db: Db,
  input: { userId: string; tokenHash: string; ttlHours: number }
): Promise<SessionRow> => {
  const expiresAt = new Date(Date.now() + input.ttlHours * 3_600_000);
  const rows = await db`
    insert into sessions (user_id, token_hash, expires_at)
    values (${input.userId}, ${input.tokenHash}, ${expiresAt})
    returning *
  `;
  return rows[0] as unknown as SessionRow;
};

interface SessionJoinRow {
  id: string;
  userId: string;
  tokenHash: string;
  deviceInstallationId: string | null;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  email: string;
  emailLower: string;
  displayName: string | null;
  locale: string;
  timezone: string;
  lifecycleStatus: string;
  userCreatedAt: Date;
  userUpdatedAt: Date;
}

export const findSessionWithUser = async (
  db: Db,
  tokenHash: string
): Promise<SessionWithUser | undefined> => {
  const rows = await db`
    select s.id, s.user_id, s.token_hash, s.device_installation_id, s.created_at, s.last_seen_at,
           s.expires_at, s.revoked_at,
           u.email, u.email_lower, u.display_name, u.locale, u.timezone, u.lifecycle_status,
           u.created_at as user_created_at, u.updated_at as user_updated_at
    from sessions s
    join users u on u.id = s.user_id
    where s.token_hash = ${tokenHash}
  `;
  const row = rows[0] as unknown as SessionJoinRow | undefined;
  if (!row) return undefined;
  return {
    session: {
      id: row.id,
      userId: row.userId,
      tokenHash: row.tokenHash,
      deviceInstallationId: row.deviceInstallationId,
      createdAt: row.createdAt,
      lastSeenAt: row.lastSeenAt,
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt,
    },
    user: {
      id: row.userId,
      email: row.email,
      emailLower: row.emailLower,
      displayName: row.displayName,
      locale: row.locale,
      timezone: row.timezone,
      lifecycleStatus: row.lifecycleStatus,
      createdAt: row.userCreatedAt,
      updatedAt: row.userUpdatedAt,
    },
  };
};

export const touchSession = async (db: Db, sessionId: string): Promise<void> => {
  await db`update sessions set last_seen_at = now() where id = ${sessionId}`;
};

export const revokeSession = async (db: Db, sessionId: string): Promise<void> => {
  await db`update sessions set revoked_at = now() where id = ${sessionId}`;
};

export const revokeAllSessions = async (db: Db, userId: string): Promise<void> => {
  await db`update sessions set revoked_at = now() where user_id = ${userId} and revoked_at is null`;
};