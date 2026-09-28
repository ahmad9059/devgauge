import { describe, expect, it } from 'vitest';

import {
  appUsableWithoutNotifications,
  notificationDeniedNotice,
  shouldRequestNotificationPermission,
} from '@/services/notifications/permissions';
import {
  evaluateThresholds,
  thresholdIntentKey,
  thresholdNotificationCopy,
} from '@/services/notifications/thresholds';

describe('notification permissions', () => {
  it('never blocks the app when notifications are denied', () => {
    expect(appUsableWithoutNotifications()).toBe(true);
    expect(notificationDeniedNotice()).toMatch(/still works/);
  });

  it('requests permission only once, contextually', () => {
    expect(shouldRequestNotificationPermission(true, 'undetermined')).toBe(
      true,
    );
    expect(shouldRequestNotificationPermission(true, 'granted')).toBe(false);
    expect(shouldRequestNotificationPermission(false, 'undetermined')).toBe(
      false,
    );
  });
});

describe('threshold evaluation', () => {
  const rules = [
    { id: 'r1', providerId: 'claude', enabled: true, threshold: 0.8 },
    { id: 'r2', providerId: 'codex', enabled: false, threshold: 0.5 },
  ];

  it('fires at or above the threshold for enabled rules only', () => {
    const intents = evaluateThresholds(
      rules,
      [
        { connectionId: 'c1', windowKey: 'w1', utilization: 0.85 },
        { connectionId: 'c1', windowKey: 'w2', utilization: 0.5 },
      ],
      new Set(),
    );
    expect(intents).toHaveLength(1);
    expect(intents[0].key).toBe(thresholdIntentKey('r1', 'c1', 'w1'));
  });

  it('skips unknown utilization and already-notified intents (idempotent)', () => {
    const notified = new Set([thresholdIntentKey('r1', 'c1', 'w1')]);
    const intents = evaluateThresholds(
      rules,
      [
        { connectionId: 'c1', windowKey: 'w1', utilization: 0.9 },
        { connectionId: 'c1', windowKey: 'w3', utilization: null },
      ],
      notified,
    );
    expect(intents).toHaveLength(0);
  });

  it('uses generic lock-screen copy', () => {
    const copy = thresholdNotificationCopy();
    expect(copy.body).not.toMatch(/claude|codex|%|token/i);
  });
});
