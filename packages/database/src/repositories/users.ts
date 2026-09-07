import type { Db } from "../client.js";

export interface UserRow {
  id: string;
  email: string;
  emailLower: string;
  displayName: string | null;
  locale: string;
  timezone: string;
  lifecycleStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

export const findUserByEmail = async (db: Db, emailLower: string): Promise<UserRow | undefined> => {
  const rows = await db`select * from users where email_lower = ${emailLower}`;
  return rows[0] as unknown as UserRow | undefined;
};

export const createUser = async (
  db: Db,
  input: { email: string; emailLower: string; displayName?: string | null }
): Promise<UserRow> => {
  const rows = await db`
    insert into users (email, email_lower, display_name)
    values (${input.email}, ${input.emailLower}, ${input.displayName ?? null})
    returning *
  `;
  return rows[0] as unknown as UserRow;
};

/** Finds an existing user by normalized email or creates one. */
export const getOrCreateUser = async (db: Db, email: string): Promise<UserRow> => {
  const emailLower = email.trim().toLowerCase();
  const existing = await findUserByEmail(db, emailLower);
  if (existing) return existing;
  return createUser(db, { email: email.trim(), emailLower });
};

export const setUserLifecycleStatus = async (
  db: Db,
  userId: string,
  status: string
): Promise<void> => {
  await db`update users set lifecycle_status = ${status}, updated_at = now() where id = ${userId}`;
};

export const hardDeleteUser = async (db: Db, userId: string): Promise<void> => {
  await db`delete from users where id = ${userId}`;
};