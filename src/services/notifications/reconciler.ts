import type { Database } from '@/storage/database';
import type { SqlDriver } from '@/storage/sqlite-driver';
import { withWriteTransaction } from '@/storage/write-transaction';
import {
  reminderNativeId,
  type NotificationScheduler,
  type ReminderRequest,
} from './scheduler';

export type NotificationOperation = {
  id: string;
  rule_id: string;
  connection_id: string | null;
  request_json: string;
  desired: number;
  state:
    'pending' | 'scheduled' | 'denied' | 'failed' | 'cancelled' | 'elapsed';
  safe_error: string | null;
  updated_at: string;
};

/** Write intent in the same transaction as the rule, before touching native state. */
export async function setNotificationIntent(
  db: SqlDriver,
  input: {
    ruleId: string;
    connectionId?: string | null;
    request: ReminderRequest;
    now: string;
  },
) {
  await db.run(
    `INSERT INTO notification_operations
    (id,rule_id,connection_id,request_json,desired,state,safe_error,updated_at)
    VALUES (?,?,?,?,1,'pending',NULL,?) ON CONFLICT(id) DO UPDATE SET
    rule_id=excluded.rule_id, connection_id=excluded.connection_id,
    request_json=excluded.request_json, desired=1, state='pending', safe_error=NULL,
    updated_at=excluded.updated_at`,
    [
      reminderNativeId(input.request.id),
      input.ruleId,
      input.connectionId ?? null,
      JSON.stringify(input.request),
      input.now,
    ],
  );
}

export async function listNotificationOperations(db: SqlDriver) {
  return db.all<NotificationOperation>(
    'SELECT * FROM notification_operations ORDER BY id',
  );
}

const runs = new WeakMap<Database, Promise<unknown>>();

/** Serializes native operations. Missing elapsed schedules never imply delivery. */
export function reconcileNotifications(
  db: Database,
  scheduler: NotificationScheduler,
  now = new Date(),
) {
  const previous = runs.get(db) ?? Promise.resolve();
  const run = previous.then(
    () => reconcile(db, scheduler, now),
    () => reconcile(db, scheduler, now),
  );
  runs.set(db, run);
  void run
    .finally(() => {
      if (runs.get(db) === run) runs.delete(db);
    })
    .catch(() => undefined);
  return run;
}

async function reconcile(
  db: Database,
  scheduler: NotificationScheduler,
  now: Date,
) {
  if (!scheduler.list || !scheduler.permission)
    throw new Error('Native reconciliation is unavailable');
  // Parent intent is authoritative; tombstones remain until native cancellation succeeds.
  await withWriteTransaction(db, (tx) =>
    tx.run(
      `UPDATE notification_operations SET desired=0, state='pending', updated_at=?
    WHERE desired=1 AND (NOT EXISTS (SELECT 1 FROM notification_rules r
      WHERE r.id=rule_id AND r.enabled=1) OR (connection_id IS NOT NULL AND NOT EXISTS
      (SELECT 1 FROM provider_connections c WHERE c.id=connection_id
        AND c.status NOT IN ('disconnected','disabled'))))`,
      [now.toISOString()],
    ),
  );
  const operations = await listNotificationOperations(db);
  const native = new Map(
    (await scheduler.list()).map((item) => [item.nativeIdentifier, item.at]),
  );
  const permission = await scheduler.permission();
  const known = new Set(operations.map((operation) => operation.id));
  // Recover native orphans left by old versions or interrupted data deletion.
  for (const id of native.keys()) {
    if (id.startsWith('devgauge.reminder.') && !known.has(id))
      await scheduler.cancel(id);
  }
  for (const operation of operations) {
    const update = async (
      state: NotificationOperation['state'],
      error: string | null = null,
    ) => {
      await withWriteTransaction(db, (tx) =>
        tx.run(
          'UPDATE notification_operations SET state=?,safe_error=?,updated_at=? WHERE id=? AND request_json=? AND desired=?',
          [
            state,
            error,
            now.toISOString(),
            operation.id,
            operation.request_json,
            operation.desired,
          ],
        ),
      );
    };
    try {
      const request = JSON.parse(operation.request_json) as ReminderRequest;
      const at = Date.parse(request.at);
      if (!Number.isFinite(at) || reminderNativeId(request.id) !== operation.id)
        throw new Error('Invalid reminder intent');
      if (!operation.desired || at <= now.getTime()) {
        if (native.has(operation.id)) await scheduler.cancel(operation.id);
        await update(operation.desired ? 'elapsed' : 'cancelled');
      } else if (permission !== 'granted') {
        if (native.has(operation.id)) await scheduler.cancel(operation.id);
        await update(
          'denied',
          'Allow notifications in Android settings to schedule this reminder.',
        );
      } else {
        if (native.get(operation.id) !== request.at) {
          if (native.has(operation.id)) await scheduler.cancel(operation.id);
          await update('pending');
          const identifier = await scheduler.schedule(request);
          if (identifier !== operation.id)
            throw new Error('Unexpected native identifier');
        }
        await update('scheduled');
      }
    } catch {
      // Native/provider error strings can contain sensitive data; never persist them.
      await update(
        'failed',
        'Reminder scheduling failed. Retry reconciliation.',
      );
    }
  }
  return listNotificationOperations(db);
}
