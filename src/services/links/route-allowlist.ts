/**
 * Routes that a notification or deep link may open. Anything else is rejected,
 * so a malicious payload cannot navigate to an arbitrary screen.
 */
export const NOTIFICATION_ROUTES = [
  '/(tabs)/usage',
  '/(tabs)/connectors',
  '/(tabs)/settings',
  '/support',
] as const;

export type NotificationRoute = (typeof NOTIFICATION_ROUTES)[number];

export function isAllowlistedRoute(route: string): route is NotificationRoute {
  return (NOTIFICATION_ROUTES as readonly string[]).includes(route);
}

export const DEFAULT_NOTIFICATION_ROUTE: NotificationRoute = '/(tabs)/usage';

export function resolveNotificationRoute(
  route: string | undefined,
): NotificationRoute {
  return route !== undefined && isAllowlistedRoute(route)
    ? route
    : DEFAULT_NOTIFICATION_ROUTE;
}
