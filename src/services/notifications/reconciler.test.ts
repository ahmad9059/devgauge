import { describe, expect, it, vi } from 'vitest';
import { createMigratedTestDatabase } from '@/testing/storage/database';
import { makeManualReset } from '@/testing/storage/factory';
import {
  saveManualResetReminder,
  deleteManualResetReminder,
} from '@/features/connections/manual-reset';
import { createMemoryScheduler } from './scheduler';
import {
  listNotificationOperations,
  reconcileNotifications,
} from './reconciler';
import { listManualResetEntries } from '@/storage/repositories/manual-reset';

const now = new Date('2026-10-01T00:00:00Z');
const entry = makeManualReset({
  id: 'recover',
  providerId: 'claude',
  resetsAt: '2026-10-02T00:00:00Z',
});
const input = { entry, timezoneOffsetMinutes: 0, now };

describe('durable notification reconciliation', () => {
  it('persists denial, then schedules once after permission is granted', async () => {
    const db = await createMigratedTestDatabase();
    const scheduler = createMemoryScheduler();
    scheduler.permission = async () => 'denied';
    await expect(saveManualResetReminder(db, scheduler, input)).rejects.toThrow(
      /Allow notifications/,
    );
    expect(await listManualResetEntries(db)).toHaveLength(1);
    expect(await listNotificationOperations(db)).toMatchObject([
      { state: 'denied' },
    ]);
    expect(scheduler.scheduled.size).toBe(0);
    scheduler.permission = async () => 'granted';
    const schedule = vi.spyOn(scheduler, 'schedule');
    await Promise.all([
      reconcileNotifications(db, scheduler, now),
      reconcileNotifications(db, scheduler, now),
    ]);
    expect(schedule).toHaveBeenCalledTimes(1);
    expect(scheduler.scheduled.size).toBe(1);
  });

  it('recovers after native success but database acknowledgement fails, without rescheduling', async () => {
    const db = await createMigratedTestDatabase();
    const scheduler = createMemoryScheduler();
    await db.exec(`CREATE TRIGGER fail_ack BEFORE UPDATE OF state ON notification_operations
      WHEN NEW.state='scheduled' BEGIN SELECT RAISE(ABORT,'injected acknowledgement failure'); END;`);
    await expect(saveManualResetReminder(db, scheduler, input)).rejects.toThrow(
      /scheduling failed/,
    );
    expect(scheduler.scheduled.size).toBe(1);
    expect(await listNotificationOperations(db)).toMatchObject([
      { state: 'failed' },
    ]);
    await db.exec('DROP TRIGGER fail_ack');
    const schedule = vi.spyOn(scheduler, 'schedule');
    await reconcileNotifications(db, scheduler, now);
    expect(schedule).not.toHaveBeenCalled();
    expect(await listNotificationOperations(db)).toMatchObject([
      { state: 'scheduled' },
    ]);
  });

  it('replaces an edited instant and includes only safe provider routing data', async () => {
    const db = await createMigratedTestDatabase();
    const scheduler = createMemoryScheduler();
    await saveManualResetReminder(db, scheduler, input);
    await saveManualResetReminder(db, scheduler, {
      ...input,
      entry: { ...entry, resetsAt: '2026-10-03T09:00+05:00' },
    });
    expect(scheduler.cancelled).toContain('devgauge.reminder.recover');
    expect([...scheduler.scheduled.values()]).toMatchObject([
      { providerId: 'claude', at: '2026-10-03T04:00:00.000Z' },
    ]);
    expect(scheduler.scheduled.size).toBe(1);
  });

  it('retains cancellation intent across deletion failure and retries without resurrecting the entry', async () => {
    const db = await createMigratedTestDatabase();
    const scheduler = createMemoryScheduler();
    await saveManualResetReminder(db, scheduler, input);
    const cancel = vi
      .spyOn(scheduler, 'cancel')
      .mockRejectedValueOnce(new Error('sensitive native detail'));
    await expect(
      deleteManualResetReminder(db, scheduler, entry.id),
    ).rejects.toThrow(/cancellation is pending/);
    expect(await listManualResetEntries(db)).toHaveLength(0);
    expect(await listNotificationOperations(db)).toMatchObject([
      {
        desired: 0,
        state: 'failed',
        safe_error: 'Reminder scheduling failed. Retry reconciliation.',
      },
    ]);
    cancel.mockRestore();
    await reconcileNotifications(db, scheduler, now);
    expect(scheduler.scheduled.size).toBe(0);
    expect(await listNotificationOperations(db)).toMatchObject([
      { state: 'cancelled' },
    ]);
  });

  it('cancels disabled rules, revocations and owned orphans; elapsed never means delivered', async () => {
    const db = await createMigratedTestDatabase();
    const scheduler = createMemoryScheduler();
    await saveManualResetReminder(db, scheduler, input);
    scheduler.permission = async () => 'denied';
    await reconcileNotifications(db, scheduler, now);
    expect(scheduler.scheduled.size).toBe(0);
    scheduler.permission = async () => 'granted';
    await reconcileNotifications(db, scheduler, now);
    await reconcileNotifications(
      db,
      scheduler,
      new Date('2026-10-03T00:00:00Z'),
    );
    expect(await listNotificationOperations(db)).toMatchObject([
      { state: 'elapsed' },
    ]);
    await scheduler.schedule({
      id: 'orphan',
      title: 'Generic',
      body: 'Generic',
      at: '2026-10-04T00:00:00Z',
    });
    await db.run('UPDATE notification_rules SET enabled=0');
    await reconcileNotifications(db, scheduler, now);
    expect(scheduler.scheduled.size).toBe(0);
    expect(await listNotificationOperations(db)).toMatchObject([
      { desired: 0, state: 'cancelled' },
    ]);
  });

  it('rolls back the entry and rule if durable intent cannot be persisted', async () => {
    const db = await createMigratedTestDatabase();
    const scheduler = createMemoryScheduler();
    await db.exec(`CREATE TRIGGER fail_intent BEFORE INSERT ON notification_operations
      BEGIN SELECT RAISE(ABORT,'injected intent failure'); END;`);
    await expect(saveManualResetReminder(db, scheduler, input)).rejects.toThrow(
      /intent failure/,
    );
    expect(await listManualResetEntries(db)).toHaveLength(0);
    expect(scheduler.scheduled.size).toBe(0);
  });
});
