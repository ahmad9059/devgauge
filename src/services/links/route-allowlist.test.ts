import { describe, expect, it } from 'vitest';

import {
  DEFAULT_NOTIFICATION_ROUTE,
  isAllowlistedRoute,
  resolveNotificationRoute,
} from '@/services/links/route-allowlist';

describe('notification route allowlist', () => {
  it('accepts only known routes', () => {
    expect(isAllowlistedRoute('/(tabs)/usage')).toBe(true);
    expect(isAllowlistedRoute('/support')).toBe(true);
    expect(isAllowlistedRoute('/(tabs)/settings')).toBe(true);
  });

  it('rejects arbitrary or hostile routes and falls back safely', () => {
    expect(isAllowlistedRoute('https://evil.test')).toBe(false);
    expect(isAllowlistedRoute('/diagnostics')).toBe(false);
    expect(resolveNotificationRoute('https://evil.test')).toBe(
      DEFAULT_NOTIFICATION_ROUTE,
    );
    expect(resolveNotificationRoute(undefined)).toBe(
      DEFAULT_NOTIFICATION_ROUTE,
    );
  });
});
