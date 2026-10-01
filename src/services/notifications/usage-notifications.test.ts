import { describe, expect, it, vi } from 'vitest';
import { createMigratedTestDatabase } from '@/testing/storage/database';
import {
  makeAttempt,
  makeConnection,
  makeRule,
  makeSnapshot,
  makeWindow,
} from '@/testing/storage/factory';
import { upsertConnection } from '@/storage/repositories/connections';
import { saveRefresh } from '@/storage/repositories/usage';
import { createMemoryScheduler } from './scheduler';
import {
  afterQuietHours,
  refreshUsageNotifications,
  saveUsageRule,
} from './usage-notifications';
import { listNotificationOperations } from './reconciler';

async function saveSnapshot(
  db: Awaited<ReturnType<typeof createMigratedTestDatabase>>,
  snapshot: ReturnType<typeof makeSnapshot>,
  windows: ReturnType<typeof makeWindow>[],
) {
  await saveRefresh(db, {
    connection: {
      id: snapshot.connectionId,
      status: 'connected',
      lastSuccessAt: snapshot.fetchedAt,
      lastAttemptAt: snapshot.fetchedAt,
      nextAllowedRefreshAt: null,
      updatedAt: snapshot.fetchedAt,
    },
    attempt: makeAttempt(snapshot.connectionId),
    snapshot: { snapshot, windows },
  });
}

const now = new Date('2026-10-01T12:00:00Z');
async function seed() {
  const db = await createMigratedTestDatabase();
  const claude = makeConnection({ id: 'claude-account', providerId: 'claude' });
  const codex = makeConnection({ id: 'codex-account', providerId: 'codex' });
  for (const connection of [claude, codex]) {
    await upsertConnection(db, connection);
    const snapshot = makeSnapshot(connection.id, {
      id: `s-${connection.id}`,
      fetchedAt: now.toISOString(),
    });
    await saveSnapshot(db, snapshot, [
      makeWindow(snapshot.id, {
        externalKey: 'weekly',
        utilization: 0.85,
        resetsAt: '2026-10-02T12:00:00Z',
      }),
    ]);
  }
  return { db, scheduler: createMemoryScheduler() };
}

describe('committed usage notification rules', () => {
  it('matches only selected provider/account/window and persists cycle dedup across startup', async () => {
    const { db, scheduler } = await seed();
    await saveUsageRule(
      db,
      makeRule({
        id: 'threshold',
        connectionId: 'claude-account',
        windowExternalKey: 'weekly',
      }),
    );
    const schedule = vi.spyOn(scheduler, 'schedule');
    await refreshUsageNotifications(db, scheduler, now);
    await refreshUsageNotifications(
      db,
      scheduler,
      new Date(now.getTime() + 10000),
    );
    expect(schedule).toHaveBeenCalledTimes(1);
    expect(await listNotificationOperations(db)).toMatchObject([
      { state: 'elapsed' },
    ]);
    const next = makeSnapshot('claude-account', {
      fetchedAt: '2026-10-02T13:00:00Z',
    });
    await saveSnapshot(db, next, [
      makeWindow(next.id, {
        externalKey: 'weekly',
        utilization: 0.9,
        resetsAt: '2026-10-09T12:00:00Z',
      }),
    ]);
    await refreshUsageNotifications(
      db,
      scheduler,
      new Date('2026-10-02T13:00:00Z'),
    );
    expect(schedule).toHaveBeenCalledTimes(2);
    expect(scheduler.scheduled.size).toBe(1);
  });

  it('replaces changed reset cycles, avoids late repeats, and cancels disconnected windows', async () => {
    const { db, scheduler } = await seed();
    await saveUsageRule(
      db,
      makeRule({
        id: 'reset',
        ruleType: 'reset-reminder',
        leadMinutes: 15,
        connectionId: 'claude-account',
      }),
    );
    const schedule = vi.spyOn(scheduler, 'schedule');
    await refreshUsageNotifications(db, scheduler, now);
    expect([...scheduler.scheduled.values()][0]?.at).toBe(
      '2026-10-02T11:45:00.000Z',
    );
    await refreshUsageNotifications(
      db,
      scheduler,
      new Date('2026-10-02T11:50:00Z'),
    );
    expect(schedule).toHaveBeenCalledTimes(1);
    const next = makeSnapshot('claude-account', {
      fetchedAt: new Date(now.getTime() + 1000).toISOString(),
    });
    await saveSnapshot(db, next, [
      makeWindow(next.id, {
        externalKey: 'weekly',
        resetsAt: '2026-10-03T12:00:00Z',
      }),
    ]);
    await refreshUsageNotifications(db, scheduler, now);
    expect(scheduler.scheduled.size).toBe(1);
    expect([...scheduler.scheduled.values()][0]?.at).toBe(
      '2026-10-03T11:45:00.000Z',
    );
    await db.run(
      "UPDATE provider_connections SET status='disconnected' WHERE id='claude-account'",
    );
    await refreshUsageNotifications(db, scheduler, now);
    expect(scheduler.scheduled.size).toBe(0);
  });

  it('does not guess unknown resets, alert on unknown utilization, or schedule stale cycles', async () => {
    const { db, scheduler } = await seed();
    await saveUsageRule(
      db,
      makeRule({ id: 'reset', ruleType: 'reset-reminder', leadMinutes: 0 }),
    );
    await saveUsageRule(db, makeRule({ id: 'threshold' }));
    const snapshot = makeSnapshot('claude-account', {
      fetchedAt: new Date(now.getTime() + 1000).toISOString(),
    });
    await saveSnapshot(db, snapshot, [
      makeWindow(snapshot.id, { resetsAt: null, utilization: null }),
    ]);
    await refreshUsageNotifications(db, scheduler, now);
    expect(scheduler.scheduled.size).toBe(0);
    const stale = makeSnapshot('claude-account', {
      fetchedAt: new Date(now.getTime() + 2000).toISOString(),
    });
    await saveSnapshot(db, stale, [
      makeWindow(stale.id, {
        resetsAt: '2026-09-30T00:00:00Z',
        utilization: 1,
      }),
    ]);
    await refreshUsageNotifications(db, scheduler, now);
    expect(scheduler.scheduled.size).toBe(0);
    expect(await listNotificationOperations(db)).toHaveLength(0);
  });

  it('never repeats an unknown threshold cycle after falling below and rising again', async () => {
    const { db, scheduler } = await seed();
    await saveUsageRule(db, makeRule({ id: 'threshold' }));
    const schedule = vi.spyOn(scheduler, 'schedule');
    for (const [index, utilization] of [0.9, 0.4, 0.95].entries()) {
      const snapshot = makeSnapshot('claude-account', {
        fetchedAt: new Date(now.getTime() + (index + 1) * 60000).toISOString(),
      });
      await saveSnapshot(db, snapshot, [
        makeWindow(snapshot.id, {
          externalKey: 'weekly',
          utilization,
          resetsAt: null,
        }),
      ]);
      await refreshUsageNotifications(
        db,
        scheduler,
        new Date(now.getTime() + index * 60000),
      );
    }
    expect(schedule).toHaveBeenCalledTimes(1);
  });

  it('skips a threshold deferred beyond its reported cycle reset', async () => {
    const { db, scheduler } = await seed();
    const hour = String(now.getHours()).padStart(2, '0');
    const end = String((now.getHours() + 1) % 24).padStart(2, '0');
    await saveUsageRule(
      db,
      makeRule({
        id: 'threshold',
        quietHoursStart: `${hour}:00`,
        quietHoursEnd: `${end}:00`,
      }),
    );
    const snapshot = makeSnapshot('claude-account', {
      fetchedAt: new Date(now.getTime() + 1000).toISOString(),
    });
    await saveSnapshot(db, snapshot, [
      makeWindow(snapshot.id, {
        utilization: 0.95,
        resetsAt: new Date(now.getTime() + 60000).toISOString(),
      }),
    ]);
    await refreshUsageNotifications(db, scheduler, now);
    expect(scheduler.scheduled.size).toBe(0);
  });

  it('validates custom thresholds and paired quiet hours before saving', async () => {
    const { db } = await seed();
    await expect(
      saveUsageRule(db, makeRule({ threshold: 1.5 })),
    ).rejects.toThrow(/Threshold/);
    await expect(
      saveUsageRule(db, makeRule({ quietHoursStart: '22:00' })),
    ).rejects.toThrow(/both quiet/);
  });

  it('defers overnight quiet hours using the local calendar', () => {
    const evening = new Date(2026, 9, 1, 23, 30);
    const morning = afterQuietHours(evening, '22:00', '08:00');
    expect([
      morning.getDate(),
      morning.getHours(),
      morning.getMinutes(),
    ]).toEqual([2, 8, 0]);
    const daytime = new Date(2026, 9, 1, 12);
    expect(afterQuietHours(daytime, '22:00', '08:00')).toBe(daytime);
    expect(afterQuietHours(daytime, '12:00', '12:00')).toBe(daytime);
  });
});
