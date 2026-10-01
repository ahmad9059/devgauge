import { beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  pathname: '/',
  navigation: { key: 'root' } as { key: string } | undefined,
  response: null as unknown,
  handled: { current: null as string | null },
  push: vi.fn(),
  clear: vi.fn(),
}));

vi.mock('react', () => ({
  useRef: () => state.handled,
  useEffect: (effect: () => unknown) => effect(),
}));
vi.mock('expo-router', () => ({
  useRouter: () => ({ push: state.push }),
  usePathname: () => state.pathname,
  useRootNavigationState: () => state.navigation,
}));
vi.mock('expo-notifications', () => ({
  setNotificationHandler: vi.fn(),
  useLastNotificationResponse: () => state.response,
  clearLastNotificationResponse: state.clear,
}));
vi.mock('react-native', () => ({
  AppState: { addEventListener: () => ({ remove: vi.fn() }) },
}));
vi.mock('@/services/app-database-store', () => ({
  getAppDatabase: async () => ({}),
}));
vi.mock('./usage-notifications', () => ({
  refreshUsageNotifications: async () => undefined,
}));
vi.mock('./expo-scheduler', () => ({
  createExpoNotificationScheduler: () => ({}),
  ensureNotificationChannel: async () => undefined,
}));

import { NotificationRuntime } from './notification-runtime';

beforeEach(() => {
  vi.clearAllMocks();
  state.pathname = '/';
  state.navigation = { key: 'root' };
  state.handled.current = null;
  state.response = {
    actionIdentifier: 'default',
    notification: {
      request: {
        identifier: 'devgauge.reminder.test',
        content: { data: { devgauge: true, providerId: 'claude' } },
      },
    },
  };
});

it('retains a cold tap through the startup redirect and routes it exactly once', () => {
  NotificationRuntime();
  expect(state.push).not.toHaveBeenCalled();
  expect(state.clear).not.toHaveBeenCalled();
  state.pathname = '/usage';
  NotificationRuntime();
  expect(state.push).toHaveBeenCalledWith('/provider/claude');
  expect(state.clear).toHaveBeenCalledOnce();
  state.pathname = '/provider/claude';
  NotificationRuntime();
  expect(state.push).toHaveBeenCalledOnce();
});

it('waits for navigation readiness and ignores unsafe payloads', () => {
  state.pathname = '/usage';
  state.navigation = undefined;
  NotificationRuntime();
  expect(state.push).not.toHaveBeenCalled();
  state.navigation = { key: 'root' };
  state.response = {
    actionIdentifier: 'default',
    notification: {
      request: {
        identifier: 'other',
        content: {
          data: { devgauge: true, providerId: 'https://example.com' },
        },
      },
    },
  };
  NotificationRuntime();
  expect(state.push).not.toHaveBeenCalled();
  expect(state.clear).not.toHaveBeenCalled();
});
