import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BACKGROUND_REFRESH_TASK,
  registerBackgroundRefresh,
} from './background-refresh';

const mocks = vi.hoisted(() => ({
  defineTask: vi.fn(),
  register: vi.fn(),
  refreshMany: vi.fn(),
  createEngine: vi.fn(),
  connections: vi.fn(),
  appState: { currentState: 'background' },
}));
vi.mock('expo-background-task', () => ({
  registerTaskAsync: mocks.register,
  BackgroundTaskResult: { Success: 1, Failed: 2 },
}));
vi.mock('expo-task-manager', () => ({ defineTask: mocks.defineTask }));
vi.mock('expo-crypto', () => ({ randomUUID: () => 'test-id' }));
vi.mock('react-native', () => ({
  AppState: mocks.appState,
  Platform: { OS: 'android' },
}));
vi.mock('./app-database-store', () => ({ getAppDatabase: async () => ({}) }));
vi.mock('@/features/dashboard/refresh-connection', () => ({
  createRefreshEngine: mocks.createEngine,
}));
vi.mock('@/providers/registry', () => ({
  createProviderRegistry: () => ({}),
  supportsMountedUsage: () => true,
}));
vi.mock('@/storage/repositories/connections', () => ({
  listConnections: mocks.connections,
}));
vi.mock('@/storage/secure-vault', () => ({ createSecureVault: () => ({}) }));
vi.mock('@/storage/secure-store-backend', () => ({
  createSecureStoreBackend: () => ({}),
}));
vi.mock('./network/client', () => ({ createHttpClient: () => ({}) }));
vi.mock('@/providers/antigravity/sync', () => ({
  fetchAntigravityUsage: vi.fn(),
}));
vi.mock('./web-session/headless-session', () => ({
  fetchHeadlessSession: vi.fn(),
}));
vi.mock('./notifications/usage-notifications', () => ({
  refreshUsageNotifications: vi.fn(),
}));
vi.mock('./notifications/expo-scheduler', () => ({
  createExpoNotificationScheduler: () => ({}),
}));
vi.mock('./history-maintenance', () => ({
  scheduleHistoryMaintenance: vi.fn(),
}));
const task = mocks.defineTask.mock.calls[0][1] as () => Promise<number>;

describe('six-hour Android background worker', () => {
  beforeEach(() => {
    mocks.appState.currentState = 'background';
    mocks.createEngine.mockReturnValue({ refreshMany: mocks.refreshMany });
    mocks.refreshMany.mockResolvedValue([{ status: 'success' }]);
    mocks.connections.mockResolvedValue([
      { id: 'connected', status: 'connected' },
      { id: 'removed', status: 'disconnected' },
    ]);
    mocks.register.mockClear();
    mocks.refreshMany.mockClear();
  });
  it('registers an Android-managed 360-minute interval', async () => {
    await registerBackgroundRefresh();
    expect(mocks.register).toHaveBeenCalledWith(BACKGROUND_REFRESH_TASK, {
      minimumInterval: 360,
    });
  });
  it('refreshes connected accounts headlessly with three retries', async () => {
    expect(await task()).toBe(1);
    expect(mocks.createEngine).toHaveBeenLastCalledWith(
      expect.objectContaining({ maxRetries: 3, deadlineMs: 40000 }),
    );
    expect(mocks.refreshMany).toHaveBeenCalledWith(['connected'], 'retry');
  });
  it('lets foreground own its current sync and reports exhausted temporary failures', async () => {
    mocks.appState.currentState = 'active';
    expect(await task()).toBe(1);
    expect(mocks.refreshMany).not.toHaveBeenCalled();
    mocks.appState.currentState = 'background';
    mocks.refreshMany.mockResolvedValue([{ status: 'transient-failure' }]);
    expect(await task()).toBe(2);
  });
});
