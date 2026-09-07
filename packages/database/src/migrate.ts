import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { Db } from "./client.js";
import { closeDb, createDb } from "./client.js";

/**
 * Applies forward-only SQL migrations in filename order, recording each in
 * `schema_migrations`. Migrations run inside a transaction each.
 */
export const runMigrations = async (db: Db, migrationsDir: string): Promise<string[]> => {
  await db`create table if not exists schema_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )`;

  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const appliedNow: string[] = [];
  for (const file of files) {
    const existing = await db`select 1 from schema_migrations where name = ${file}`;
    if (existing.length > 0) continue;

    const content = await readFile(path.join(migrationsDir, file), "utf8");
    await db.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`insert into schema_migrations (name) values (${file})`;
    });
    appliedNow.push(file);
  }
  return appliedNow;
};

const isMain = (): boolean => {
  if (!process.argv[1]) return false;
  return import.meta.url === pathToFileURL(process.argv[1]).href;
};

if (isMain()) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required to run migrations");
    process.exit(1);
  }
  const dir = process.env.DATABASE_MIGRATIONS_DIR ?? path.join(process.cwd(), "migrations");
  const db = createDb(url);
  try {
    const applied = await runMigrations(db, dir);
    console.log(applied.length === 0 ? "Migrations up to date." : `Applied: ${applied.join(", ")}`);
  } finally {
    await closeDb(db);
  }
}