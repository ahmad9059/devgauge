import type { ProviderId } from '@/domain/providers';

export type ReminderRequest = {
  /** Stable entry id; also used to derive the native identifier. */
  id: string;
  title: string;
  body: string;
  /** UTC ISO-8601 instant the reminder should fire. */
  at: string;
  providerId?: ProviderId;
};

export type NotificationScheduler = {
  /** Schedules and returns the native identifier (idempotent by identifier). */
  schedule(request: ReminderRequest): Promise<string>;
  cancel(nativeIdentifier: string): Promise<void>;
  /** Native identifiers currently pending, without requesting permission. */
  list?(): Promise<{ nativeIdentifier: string; at: string | null }[]>;
  permission?(): Promise<'granted' | 'denied' | 'undetermined'>;
};

/** Stable native identifier so rescheduling the same entry never duplicates. */
export function reminderNativeId(entryId: string): string {
  return `devgauge.reminder.${entryId}`;
}

/** Generic, non-sensitive notification copy (SECURITY.md §8). */
export function reminderCopy(): { title: string; body: string } {
  return {
    title: 'DevGauge reminder',
    body: 'Check your provider’s scheduled usage reset.',
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
    async list() {
      return [...scheduled].map(([nativeIdentifier, request]) => ({
        nativeIdentifier,
        at: request.at,
      }));
    },
    async permission() {
      return 'granted';
    },
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
