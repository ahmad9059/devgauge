import * as Notifications from 'expo-notifications';
import { useRootNavigationState, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ensureNotificationChannel } from './expo-scheduler';
import { notificationProviderRoute } from './tap-route';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Handles cold-start and foreground taps once navigation is mounted. */
export function NotificationRuntime() {
  const router = useRouter();
  const navigation = useRootNavigationState();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    void ensureNotificationChannel().catch(() => undefined);
    if (!navigation?.key) return;
    const handle = (response: Notifications.NotificationResponse) => {
      const id = `${response.notification.request.identifier}:${response.actionIdentifier}`;
      if (handled.current === id) return;
      const route = notificationProviderRoute(
        response.notification.request.content.data,
      );
      if (!route) return;
      handled.current = id;
      router.push(route);
      Notifications.clearLastNotificationResponse();
    };
    const pending = Notifications.getLastNotificationResponse();
    if (pending) handle(pending);
    const subscription =
      Notifications.addNotificationResponseReceivedListener(handle);
    return () => subscription.remove();
  }, [router, navigation?.key]);
  return null;
}
