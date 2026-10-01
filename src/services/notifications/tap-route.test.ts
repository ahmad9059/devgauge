import { describe, expect, it } from 'vitest';
import { notificationProviderRoute } from './tap-route';

describe('notification navigation allowlist', () => {
  it('routes only an owned payload with a known provider', () => {
    expect(
      notificationProviderRoute({ devgauge: true, providerId: 'claude' }),
    ).toBe('/provider/claude');
    for (const data of [
      null,
      {},
      { providerId: 'claude' },
      { devgauge: true, providerId: '../settings' },
      { devgauge: true, url: 'https://evil.test' },
    ])
      expect(notificationProviderRoute(data)).toBeNull();
  });
});
