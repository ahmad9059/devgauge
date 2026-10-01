import type { Database } from '@/storage/database';
import { getSetting } from '@/storage/repositories/settings';
import { prune } from '@/storage/repositories/usage';

type MaintenanceState = {
  pending: boolean;
  completedAt: number;
  historyDays: number | null;
  error: boolean;
};
const stateByDatabase = new WeakMap<Database, MaintenanceState>();

/** Bounded work runs after cached paint and never extends refresh completion. */
export function scheduleHistoryMaintenance(
  db: Database,
  now: () => Date = () => new Date(),
) {
  let state = stateByDatabase.get(db);
  if (!state) {
    state = { pending: false, completedAt: 0, historyDays: null, error: false };
    stateByDatabase.set(db, state);
  }
  if (state.pending) return;
  state.pending = true;
  const current = state;
  setTimeout(() => {
    void (async () => {
      try {
        const stored = await getSetting(db, 'dashboard.historyDays');
        const historyDays = typeof stored === 'number' ? stored : 90;
        if (
          historyDays === current.historyDays &&
          now().getTime() - current.completedAt < 86400000
        )
          return;
        const report = await prune(
          db,
          {
            historyDays,
            failedAttemptDays: 30,
            successfulAttemptDays: historyDays,
            maxRows: 500,
          },
          now(),
        );
        current.historyDays = historyDays;
        // An unfinished bounded pass continues on the next refresh rather than looping.
        current.completedAt =
          report.snapshotsDeleted < 500 && report.attemptsDeleted < 500
            ? now().getTime()
            : 0;
        current.error = false;
      } catch {
        current.error = true;
      } finally {
        current.pending = false;
      }
    })();
  }, 1000);
}

export function historyMaintenanceStatus(db: Database) {
  return (
    stateByDatabase.get(db) ?? {
      pending: false,
      completedAt: 0,
      historyDays: null,
      error: false,
    }
  );
}
