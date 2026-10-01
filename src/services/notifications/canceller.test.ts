import { describe, expect, it, vi } from 'vitest';
import { createMigratedTestDatabase } from '@/testing/storage/database';
import { makeConnection, makeRule } from '@/testing/storage/factory';
import { upsertConnection } from '@/storage/repositories/connections';
import { upsertNotificationRule } from '@/storage/repositories/notifications';
import { createMemoryScheduler } from './scheduler';
import {
  reconcileNotifications,
  setNotificationIntent,
  listNotificationOperations,
} from './reconciler';
import { createNotificationCanceller } from './canceller';

it('cancels only the disconnected account and preserves failed cancellation for retry', async () => {
  const db = await createMigratedTestDatabase();
  const scheduler = createMemoryScheduler();
  const now = new Date();
  for (const id of ['a', 'b']) {
    await upsertConnection(db, makeConnection({ id, canonicalAccountKey: id }));
    await upsertNotificationRule(db, makeRule({ id }));
    await setNotificationIntent(db, {
      ruleId: id,
      connectionId: id,
      now: now.toISOString(),
      request: {
        id,
        title: 'Generic',
        body: 'Generic',
        at: new Date(now.getTime() + 60000).toISOString(),
      },
    });
  }
  await reconcileNotifications(db, scheduler, now);
  const cancel = vi
    .spyOn(scheduler, 'cancel')
    .mockRejectedValueOnce(new Error('native failure'));
  const canceller = createNotificationCanceller(db, scheduler);
  await expect(canceller.cancelForConnection('a')).rejects.toThrow(
    /cancellation is pending/,
  );
  expect(await listNotificationOperations(db)).toMatchObject([
    { desired: 0, state: 'failed' },
    { desired: 1, state: 'scheduled' },
  ]);
  cancel.mockRestore();
  await canceller.cancelForConnection('a');
  expect([...scheduler.scheduled.keys()]).toEqual(['devgauge.reminder.b']);
});

describe('delete-all cancellation', () => {
  it('removes owned native orphans before local journal deletion', async () => {
    const db = await createMigratedTestDatabase();
    const scheduler = createMemoryScheduler();
    await scheduler.schedule({
      id: 'orphan',
      title: 'Generic',
      body: 'Generic',
      at: new Date(Date.now() + 60000).toISOString(),
    });
    await createNotificationCanceller(db, scheduler).cancelAll();
    expect(scheduler.scheduled.size).toBe(0);
  });
});
