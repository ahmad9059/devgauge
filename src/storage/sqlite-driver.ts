// Minimal async SQL surface shared by the expo-sqlite runtime adapter and the
// node:sqlite test driver. Keeping it small keeps repositories portable and
// unit-testable without a device.

export type SqlValue = string | number | null;

export type SqlRunResult = {
  changes: number;
  lastInsertRowId: number;
};

export interface SqlDriver {
  /** Static SQL only; never called with user/provider-derived values. */
  exec(source: string): Promise<void>;
  run(source: string, params?: SqlValue[]): Promise<SqlRunResult>;
  first<T>(source: string, params?: SqlValue[]): Promise<T | null>;
  all<T>(source: string, params?: SqlValue[]): Promise<T[]>;
  close(): Promise<void>;
}
