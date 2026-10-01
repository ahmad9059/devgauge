import { describe, expect, it } from 'vitest';

import {
  deleteManualResetReminder,
  saveManualResetReminder,
  validateManualReset,
} from '@/features/connections/manual-reset';
import { createMemoryScheduler } from '@/services/notifications/scheduler';
import { listManualResetEntries } from '@/storage/repositories/manual-reset';
import {
  listNotificationRules,
  listScheduledNotifications,
} from '@/storage/repositories/notifications';
import { createMigratedTestDatabase } from '@/testing/storage/database';
import { makeManualReset } from '@/testing/storage/factory';

const NOW = new Date('2026-09-28T00:00:00.000Z');
const entry = makeManualReset({
  id: 'm1',
  providerId: 'claude',
  resetsAt: '2026-10-01T00:00:00.000Z',
});

describe('manual reset validation', () => {
  it.each(['2026-10-01T12:00', '2026-02-30T12:00Z', 'Oct 1, 2026 12:00 PM'])(
    'rejects ambiguous or rolled-over %s',
    (resetsAt) => {
      expect(
        validateManualReset({ resetsAt, timezoneOffsetMinutes: 0, now: NOW }),
      ).toMatchObject({ ok: false });
    },
  );
  it('accepts an explicit timezone offset and rejects invalid timezone confirmation', () => {
    expect(
      validateManualReset({
        resetsAt: '2026-10-01T12:00+05:00',
        timezoneOffsetMinutes: -300,
        now: NOW,
      }),
    ).toEqual({ ok: true });
    expect(
      validateManualReset({
        resetsAt: entry.resetsAt,
        timezoneOffsetMinutes: 1000,
        now: NOW,
      }),
    ).toMatchObject({ ok: false });
  });
  it('requires a valid future time and a confirmed timezone', () => {
    expect(
      validateManualReset({
        resetsAt: 'not-a-date',
        timezoneOffsetMinutes: 0,
        now: NOW,
      }),
    ).toMatchObject({ ok: false });
    expect(
      validateManualReset({
        resetsAt: '2026-09-27T00:00:00.000Z',
        timezoneOffsetMinutes: 0,
        now: NOW,
      }),
    ).toMatchObject({ ok: false, reason: /future/ });
    expect(
      validateManualReset({
        resetsAt: '2026-10-01T00:00:00.000Z',
        timezoneOffsetMinutes: null,
        now: NOW,
      }),
    ).toMatchObject({ ok: false, reason: /timezone/ });
    expect(
      validateManualReset({
        resetsAt: '2026-10-01T00:00:00.000Z',
        timezoneOffsetMinutes: 0,
        now: NOW,
      }),
    ).toEqual({ ok: true });
  });
});

describe('manual reset reminders', () => {
  it('saves a labeled entry with one generic, idempotent reminder', async () => {
    const db = await createMigratedTestDatabase();
    const scheduler = createMemoryScheduler();

    const first = await saveManualResetReminder(db, scheduler, {
      entry,
      timezoneOffsetMinutes: 0,
      now: NOW,
    });
    expect(first.nativeIdentifier).toBe('devgauge.reminder.m1');
    expect(await listManualResetEntries(db)).toHaveLength(1);
    expect(await listNotificationRules(db)).toHaveLength(1);
    expect(await listScheduledNotifications(db)).toHaveLength(1);
    expect(scheduler.scheduled.size).toBe(1);

    await saveManualResetReminder(db, scheduler, {
      entry,
      timezoneOffsetMinutes: 0,
      now: NOW,
    });
    expect(await listManualResetEntries(db)).toHaveLength(1);
    expect(await listScheduledNotifications(db)).toHaveLength(1);
    expect(scheduler.scheduled.size).toBe(1);
  });

  it('rejects an invalid reminder', async () => {
    const db = await createMigratedTestDatabase();
    const scheduler = createMemoryScheduler();
    await expect(
      saveManualResetReminder(db, scheduler, {
        entry: makeManualReset({
          id: 'm2',
          resetsAt: '2026-09-01T00:00:00.000Z',
        }),
        timezoneOffsetMinutes: 0,
        now: NOW,
      }),
    ).rejects.toThrow(/future/);
  });

  it('deletion cancels the native schedule and removes local data', async () => {
    const db = await createMigratedTestDatabase();
    const scheduler = createMemoryScheduler();
    await saveManualResetReminder(db, scheduler, {
      entry,
      timezoneOffsetMinutes: 0,
      now: NOW,
    });

    await deleteManualResetReminder(db, scheduler, 'm1');

    expect(scheduler.cancelled).toContain('devgauge.reminder.m1');
    expect(scheduler.scheduled.size).toBe(0);
    expect(await listManualResetEntries(db)).toHaveLength(0);
    expect(await listNotificationRules(db)).toHaveLength(0);
    expect(await listScheduledNotifications(db)).toHaveLength(0);
  });
});
