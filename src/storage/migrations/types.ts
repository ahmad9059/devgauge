/** A single forward-only migration. Files are immutable once released. */
export type Migration = {
  version: number;
  name: string;
  /** Static DDL only; executed with `exec`, never interpolated. */
  sql: string;
};
