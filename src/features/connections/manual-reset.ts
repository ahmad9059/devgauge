import { normalizeResetTime } from '@/domain/reset-time';
import {
  reminderCopy,
  type NotificationScheduler,
} from '@/services/notifications/scheduler';
import type { Database } from '@/storage/database';
import { withWriteTransaction } from '@/storage/write-transaction';
import {
  reconcileNotifications,
  setNotificationIntent,
} from '@/services/notifications/reconciler';
import {
  deleteManualResetEntry,
  upsertManualResetEntry,
} from '@/storage/repositories/manual-reset';
import {
  deleteNotificationRule,
  upsertNotificationRule,
  upsertScheduledNotification,
} from '@/storage/repositories/notifications';
import type { ManualResetEntry } from '@/storage/types';

export type ManualResetValidation =
  { ok: true } | { ok: false; reason: string };

/** Validates a reset time and requires an explicit timezone confirmation. */
export function validateManualReset(input: {
  resetsAt: string;
  timezoneOffsetMinutes: number | null;
  now: Date;
}): ManualResetValidation {
  const instant = normalizeResetTime(input.resetsAt);
  const at = instant ? Date.parse(instant) : NaN;
  if (!Number.isFinite(at))
    return {
      ok: false,
      reason:
        'Enter an ISO date and time with Z or an explicit offset, such as +05:00.',
    };
  if (at <= input.now.getTime()) {
    return { ok: false, reason: 'Choose a time in the future.' };
  }
  if (
    input.timezoneOffsetMinutes === null ||
    !Number.isInteger(input.timezoneOffsetMinutes) ||
    Math.abs(input.timezoneOffsetMinutes) > 840
  ) {
    return { ok: false, reason: 'Confirm your timezone.' };
  }
  return { ok: true };
}

function resetRuleId(entryId: string): string {
  return `reset-rule-${entryId}`;
}

function scheduledId(entryId: string): string {
  return `sched-${entryId}`;
}

export type SaveManualResetInput = {
  entry: ManualResetEntry;
  timezoneOffsetMinutes: number;
  now: Date;
};

/**
 * Persists a manual reset entry and schedules a single generic reminder. It is
 * idempotent: re-saving updates the same entry, rule, and native identifier
 * rather than duplicating a schedule.
 */
export async function saveManualResetReminder(
  db: Database,
  scheduler: NotificationScheduler,
  input: SaveManualResetInput,
): Promise<{ nativeIdentifier: string }> {
  const validation = validateManualReset({
    resetsAt: input.entry.resetsAt,
    timezoneOffsetMinutes: input.timezoneOffsetMinutes,
    now: input.now,
  });
  if (!validation.ok) throw new Error(validation.reason);

  const at = normalizeResetTime(input.entry.resetsAt)!;
  const copy = reminderCopy();
  await withWriteTransaction(db, async (tx) => {
    await upsertManualResetEntry(tx, { ...input.entry, resetsAt: at });
    await upsertNotificationRule(tx, {
      id: resetRuleId(input.entry.id),
      providerId: input.entry.providerId,
      ruleType: 'reset-reminder',
      enabled: true,
      threshold: null,
      leadMinutes: null,
      quietHoursStart: null,
      quietHoursEnd: null,
      createdAt: input.now.toISOString(),
      updatedAt: input.now.toISOString(),
    });
    await setNotificationIntent(tx, {
      ruleId: resetRuleId(input.entry.id),
      request: {
        id: input.entry.id,
        ...copy,
        at,
        providerId: input.entry.providerId,
      },
      now: input.now.toISOString(),
    });
  });
  const operations = await reconcileNotifications(db, scheduler, input.now);
  const operation = operations.find(
    (item) => item.rule_id === resetRuleId(input.entry.id),
  );
  if (operation?.state !== 'scheduled') {
    throw new Error(
      operation?.safe_error ?? 'Reminder is pending. Retry scheduling.',
    );
  }
  const nativeIdentifier = operation.id;
  await upsertScheduledNotification(db, {
    id: scheduledId(input.entry.id),
    ruleId: resetRuleId(input.entry.id),
    connectionId: null,
    windowExternalKey: null,
    nativeIdentifier,
    scheduledFor: at,
    status: 'scheduled',
    createdAt: input.now.toISOString(),
    updatedAt: input.now.toISOString(),
  });

  return { nativeIdentifier };
}

/** Deletes the entry and cancels its native schedule (cascade removes the row). */
export async function deleteManualResetReminder(
  db: Database,
  scheduler: NotificationScheduler,
  entryId: string,
): Promise<void> {
  await withWriteTransaction(db, async (tx) => {
    await tx.run(
      "UPDATE notification_operations SET desired=0,state='pending' WHERE rule_id=?",
      [resetRuleId(entryId)],
    );
    await deleteNotificationRule(tx, resetRuleId(entryId));
    await deleteManualResetEntry(tx, entryId);
  });
  const operations = await reconcileNotifications(db, scheduler);
  if (
    operations.some(
      (item) =>
        item.rule_id === resetRuleId(entryId) && item.state === 'failed',
    )
  ) {
    throw new Error(
      'Reminder deleted locally; native cancellation is pending. Retry reconciliation.',
    );
  }
}
