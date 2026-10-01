import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createExpoNotificationScheduler,
  requestNotificationPermission,
  NOTIFICATION_CHANNEL,
} from './expo-scheduler';

const native = vi.hoisted(() => ({
  AndroidImportance: { HIGH: 4 },
  AndroidNotificationVisibility: { PUBLIC: 1 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  setNotificationChannelAsync: vi.fn(),
  getPermissionsAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
  scheduleNotificationAsync: vi.fn(),
  cancelScheduledNotificationAsync: vi.fn(),
  getAllScheduledNotificationsAsync: vi.fn(),
}));
vi.mock('expo-notifications', () => native);
vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));

beforeEach(() => {
  vi.clearAllMocks();
  native.getPermissionsAsync.mockResolvedValue({
    status: 'granted',
    canAskAgain: true,
  });
  native.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
  native.scheduleNotificationAsync.mockImplementation(
    async (request: { identifier: string }) => request.identifier,
  );
});

describe('Android notification scheduler', () => {
  it('creates a channel before a contextual permission request', async () => {
    native.getPermissionsAsync.mockResolvedValue({
      status: 'undetermined',
      canAskAgain: true,
    });
    expect(await requestNotificationPermission()).toBe('granted');
    expect(
      native.setNotificationChannelAsync.mock.invocationCallOrder[0],
    ).toBeLessThan(native.requestPermissionsAsync.mock.invocationCallOrder[0]);
  });
  it('does not request permission from reconciliation or after permanent denial', async () => {
    native.getPermissionsAsync.mockResolvedValue({
      status: 'denied',
      canAskAgain: false,
    });
    await expect(
      createExpoNotificationScheduler().schedule({
        id: 'r',
        title: 'DevGauge',
        body: 'Reset',
        at: '2099-01-01T00:00:00Z',
      }),
    ).rejects.toThrow('permission');
    expect(await requestNotificationPermission()).toBe('denied');
    expect(native.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(native.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
  it('schedules a future absolute instant with owned safe tap data and the Android channel', async () => {
    const scheduler = createExpoNotificationScheduler();
    expect(
      await scheduler.schedule({
        id: 'r',
        title: 'DevGauge',
        body: 'Reset',
        at: '2099-01-01T05:00:00+05:00',
        providerId: 'claude',
      }),
    ).toBe('devgauge.reminder.r');
    expect(native.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          data: {
            devgauge: true,
            devgaugeScheduleAt: '2099-01-01T00:00:00.000Z',
            providerId: 'claude',
          },
        }),
        trigger: {
          type: 'date',
          date: new Date('2099-01-01T00:00:00.000Z'),
          channelId: NOTIFICATION_CHANNEL,
        },
      }),
    );
    await expect(
      scheduler.schedule({
        id: 'bad',
        title: 'DevGauge',
        body: 'Reset',
        at: 'in 2 hours',
      }),
    ).rejects.toThrow('absolute');
  });
  it('enumerates only app-owned pending identifiers', async () => {
    native.getAllScheduledNotificationsAsync.mockResolvedValue([
      { identifier: 'other.notification', content: { data: {} } },
      {
        identifier: 'devgauge.reminder.r',
        content: { data: { devgaugeScheduleAt: '2099-01-01T00:00Z' } },
      },
    ]);
    expect(await createExpoNotificationScheduler().list!()).toEqual([
      {
        nativeIdentifier: 'devgauge.reminder.r',
        at: '2099-01-01T00:00:00.000Z',
      },
    ]);
  });
});
