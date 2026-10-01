import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { normalizeResetTime } from '@/domain/reset-time';

import {
  reminderNativeId,
  type NotificationScheduler,
  type ReminderRequest,
} from './scheduler';

export const NOTIFICATION_CHANNEL = 'devgauge.usage';

export async function getNotificationPermission() {
  return Notifications.getPermissionsAsync();
}

export async function ensureNotificationChannel() {
  if (Platform.OS === 'android')
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL, {
      name: 'Usage alerts and resets',
      importance: Notifications.AndroidImportance.HIGH,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
}

/** Only explicit user enablement calls this; startup reconciliation never prompts. */
export async function requestNotificationPermission() {
  await ensureNotificationChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted' || !current.canAskAgain)
    return current.status;
  return (await Notifications.requestPermissionsAsync()).status;
}

/** Permission must already be granted by a contextual opt-in action. */
export function createExpoNotificationScheduler(): NotificationScheduler {
  return {
    async schedule(request: ReminderRequest): Promise<string> {
      await ensureNotificationChannel();
      const current = await Notifications.getPermissionsAsync();
      if (current.status !== 'granted') {
        throw new Error('notification permission not granted');
      }
      const at = normalizeResetTime(request.at);
      if (!at || Date.parse(at) <= Date.now())
        throw new Error('Reminder requires a future absolute instant');
      const identifier = reminderNativeId(request.id);
      return Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title: request.title,
          body: request.body,
          data: {
            devgauge: true,
            devgaugeScheduleAt: at,
            ...(request.providerId ? { providerId: request.providerId } : {}),
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(at),
          channelId: NOTIFICATION_CHANNEL,
        },
      });
    },
    async permission() {
      return (await Notifications.getPermissionsAsync()).status;
    },
    async list() {
      return (await Notifications.getAllScheduledNotificationsAsync())
        .filter((request) =>
          request.identifier.startsWith('devgauge.reminder.'),
        )
        .map((request) => ({
          nativeIdentifier: request.identifier,
          at: normalizeResetTime(request.content.data?.devgaugeScheduleAt),
        }));
    },
    async cancel(nativeIdentifier: string): Promise<void> {
      await Notifications.cancelScheduledNotificationAsync(nativeIdentifier);
    },
  };
}
