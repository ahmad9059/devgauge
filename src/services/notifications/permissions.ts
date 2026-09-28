export type NotificationPermissionStatus =
  'granted' | 'denied' | 'undetermined';

/** The app is fully usable whether or not notifications are allowed. */
export function appUsableWithoutNotifications(): boolean {
  return true;
}

/** Ask only once, contextually, after the user enables a reminder. */
export function shouldRequestNotificationPermission(
  enabled: boolean,
  status: NotificationPermissionStatus,
): boolean {
  return enabled && status === 'undetermined';
}

export function notificationDeniedNotice(): string {
  return 'Notifications are off, so reminders will not fire. DevGauge still works fully.';
}
