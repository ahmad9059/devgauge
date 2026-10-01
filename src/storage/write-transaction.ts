import type { Database } from './database';
import type { SqlDriver } from './sqlite-driver';

const writes = new WeakMap<Database, Promise<unknown>>();

/** Repository entrypoints queue exclusive writes on the single native handle. */
export function withWriteTransaction<T>(
  db: Database,
  task: (tx: SqlDriver) => Promise<T>,
): Promise<T> {
  const previous = writes.get(db) ?? Promise.resolve();
  const result = previous.then(
    () => db.transaction(task),
    () => db.transaction(task),
  );
  const tail = result.then(
    () => undefined,
    () => undefined,
  );
  writes.set(db, tail);
  void tail.then(() => {
    if (writes.get(db) === tail) writes.delete(db);
  });
  return result;
}
