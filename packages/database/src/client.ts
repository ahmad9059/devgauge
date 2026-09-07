import postgres from "postgres";

export type Db = ReturnType<typeof postgres>;

/**
 * Creates a PostgreSQL client (porsager/postgres) from a connection string.
 * `transform: postgres.camel` maps snake_case result columns to camelCase so
 * repositories work with camelCase row interfaces.
 */
export const createDb = (url: string): Db =>
  postgres(url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    transform: postgres.camel,
  });

export const closeDb = async (db: Db): Promise<void> => {
  await db.end({ timeout: 5 });
};