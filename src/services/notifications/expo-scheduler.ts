import * as Notifications from 'expo-notifications';

import {
  reminderNativeId,
  type NotificationScheduler,
  type ReminderRequest,
} from './scheduler';

/**
 * Real Android local-notification scheduler. Permission is requested lazily on
 * first schedule; a denial rejects the schedule but never blocks the app.
 */
export function createExpoNotificationScheduler(): NotificationScheduler {
  return {
    async schedule(request: ReminderRequest): Promise<string> {
      const current = await Notifications.getPermissionsAsync();
      if (current.status !== 'granted') {
        const requested = await Notifications.requestPermissionsAsync();
        if (requested.status !== 'granted') {
          throw new Error('notification permission not granted');
        }
      }
      const identifier = reminderNativeId(request.id);
      return Notifications.scheduleNotificationAsync({
        identifier,
        content: { title: request.title, body: request.body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(request.at),
        },
      });
    },
    async cancel(nativeIdentifier: string): Promise<void> {
      await Notifications.cancelScheduledNotificationAsync(nativeIdentifier);
    },
  };
}
