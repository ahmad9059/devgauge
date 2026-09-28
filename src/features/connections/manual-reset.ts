import {
  reminderCopy,
  reminderNativeId,
  type NotificationScheduler,
} from '@/services/notifications/scheduler';
import type { Database } from '@/storage/database';
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
  const at = Date.parse(input.resetsAt);
  if (!Number.isFinite(at))
    return { ok: false, reason: 'Enter a valid date and time.' };
  if (at <= input.now.getTime()) {
    return { ok: false, reason: 'Choose a time in the future.' };
  }
  if (
    input.timezoneOffsetMinutes === null ||
    !Number.isFinite(input.timezoneOffsetMinutes)
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

  await upsertManualResetEntry(db, input.entry);
  await upsertNotificationRule(db, {
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

  const copy = reminderCopy();
  const nativeIdentifier = await scheduler.schedule({
    id: input.entry.id,
    title: copy.title,
    body: copy.body,
    at: input.entry.resetsAt,
  });
  await upsertScheduledNotification(db, {
    id: scheduledId(input.entry.id),
    ruleId: resetRuleId(input.entry.id),
    connectionId: null,
    windowExternalKey: null,
    nativeIdentifier,
    scheduledFor: input.entry.resetsAt,
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
  await scheduler.cancel(reminderNativeId(entryId));
  await deleteNotificationRule(db, resetRuleId(entryId));
  await deleteManualResetEntry(db, entryId);
}
