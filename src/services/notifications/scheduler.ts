export type ReminderRequest = {
  /** Stable entry id; also used to derive the native identifier. */
  id: string;
  title: string;
  body: string;
  /** UTC ISO-8601 instant the reminder should fire. */
  at: string;
};

export type NotificationScheduler = {
  /** Schedules and returns the native identifier (idempotent by identifier). */
  schedule(request: ReminderRequest): Promise<string>;
  cancel(nativeIdentifier: string): Promise<void>;
};

/** Stable native identifier so rescheduling the same entry never duplicates. */
export function reminderNativeId(entryId: string): string {
  return `devgauge.reminder.${entryId}`;
}

/** Generic, non-sensitive notification copy (SECURITY.md §8). */
export function reminderCopy(): { title: string; body: string } {
  return {
    title: 'DevGauge reminder',
    body: 'A usage window is resetting soon.',
  };
}

export type MemoryScheduler = NotificationScheduler & {
  scheduled: Map<string, ReminderRequest>;
  cancelled: string[];
};

export function createMemoryScheduler(): MemoryScheduler {
  const scheduled = new Map<string, ReminderRequest>();
  const cancelled: string[] = [];
  return {
    scheduled,
    cancelled,
    async schedule(request) {
      const identifier = reminderNativeId(request.id);
      scheduled.set(identifier, request);
      return identifier;
    },
    async cancel(nativeIdentifier) {
      scheduled.delete(nativeIdentifier);
      cancelled.push(nativeIdentifier);
    },
  };
}
