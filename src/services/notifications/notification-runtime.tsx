import * as Notifications from 'expo-notifications';
import { usePathname, useRootNavigationState, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { getAppDatabase } from '@/services/app-database-store';
import { refreshUsageNotifications } from './usage-notifications';
import {
  createExpoNotificationScheduler,
  ensureNotificationChannel,
} from './expo-scheduler';
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
  const pathname = usePathname();
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    const scheduler = createExpoNotificationScheduler();
    const recover = () => {
      void getAppDatabase()
        .then((db) => refreshUsageNotifications(db, scheduler))
        .catch(() => undefined);
    };
    recover();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') recover();
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    void ensureNotificationChannel().catch(() => undefined);
    // app/index redirects to Usage on startup. Wait until that redirect has
    // settled so it cannot overwrite the destination of a cold notification tap.
    if (!navigation?.key || pathname === '/' || !response) return;
    const id = `${response.notification.request.identifier}:${response.actionIdentifier}`;
    if (handled.current === id) return;
    const route = notificationProviderRoute(
      response.notification.request.content.data,
    );
    if (!route) return;
    handled.current = id;
    router.push(route);
    Notifications.clearLastNotificationResponse();
  }, [router, navigation?.key, pathname, response]);
  return null;
}
