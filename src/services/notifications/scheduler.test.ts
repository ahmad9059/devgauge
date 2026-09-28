import { describe, expect, it } from 'vitest';

import {
  createMemoryScheduler,
  reminderCopy,
  reminderNativeId,
} from '@/services/notifications/scheduler';

describe('notification scheduler', () => {
  it('derives a stable native identifier', () => {
    expect(reminderNativeId('entry-1')).toBe('devgauge.reminder.entry-1');
    expect(reminderNativeId('entry-1')).toBe(reminderNativeId('entry-1'));
  });

  it('schedules and cancels idempotently', async () => {
    const scheduler = createMemoryScheduler();
    const identifier = await scheduler.schedule({
      id: 'entry-1',
      ...reminderCopy(),
      at: '2026-10-01T00:00:00.000Z',
    });
    await scheduler.schedule({
      id: 'entry-1',
      ...reminderCopy(),
      at: '2026-10-01T00:00:00.000Z',
    });
    expect(scheduler.scheduled.size).toBe(1);

    await scheduler.cancel(identifier);
    expect(scheduler.scheduled.size).toBe(0);
    expect(scheduler.cancelled).toContain(identifier);
  });

  it('uses generic, non-sensitive copy', () => {
    const copy = reminderCopy();
    expect(copy.body).not.toMatch(/token|account|%/i);
  });
});
