// Sanitized mock payloads. They intentionally contain no tokens, cookies, or
// account identifiers so they are safe to commit and to log.

export const MOCK_HOST = 'mock.devgauge.test';
export const MOCK_BASE_URL = `https://${MOCK_HOST}`;
export const MOCK_USAGE_PATH = '/v1/usage';
export const MOCK_FETCHED_AT = '2026-09-28T00:00:00.000Z';

export function successFixture(): string {
  return JSON.stringify({
    schemaVersion: 1,
    fetchedAt: MOCK_FETCHED_AT,
    account: {
      displayName: 'Mock account',
      accountHint: 'm***@example.com',
      scope: 'personal',
    },
    windows: [
      {
        key: 'five-hour',
        kind: 'rolling',
        label: '5-hour window',
        unit: 'percent',
        used: '42',
        limit: '100',
        resetsAt: '2026-09-28T05:00:00.000Z',
      },
      {
        key: 'weekly',
        kind: 'weekly',
        label: 'Weekly',
        unit: 'percent',
        used: '71',
        limit: '100',
      },
    ],
  });
}

/** Consumption without an entitlement cap: limit stays null, never zero. */
export function partialFixture(): string {
  return JSON.stringify({
    schemaVersion: 1,
    partial: true,
    windows: [
      {
        key: 'monthly',
        kind: 'monthly',
        label: 'Monthly requests',
        unit: 'requests',
        used: '640',
      },
    ],
  });
}

export function currencyFixture(): string {
  return JSON.stringify({
    schemaVersion: 1,
    windows: [
      {
        key: 'billing',
        kind: 'billing',
        label: 'Billing period',
        unit: 'currency',
        used: '18.50',
        limit: '40',
        currencyCode: 'USD',
      },
    ],
  });
}

export function hostileFixture(): string {
  return JSON.stringify({
    schemaVersion: 1,
    windows: [
      {
        key: 'five-hour',
        kind: 'rolling',
        label: '<script>alert(1)</script> "quoted" ' + 'x'.repeat(150),
        unit: 'percent',
        used: '5',
        limit: '100',
      },
    ],
  });
}

/** Missing a required field and using an unknown enum value. */
export function schemaChangedFixture(): string {
  return JSON.stringify({
    windows: [
      {
        key: 'five-hour',
        kind: 'fortnightly',
        label: '5-hour window',
        unit: 'percent',
      },
    ],
  });
}

export function notJsonFixture(): string {
  return '<html>not the API you are looking for</html>';
}

export function oversizedFixture(bytes = 300_000): string {
  return JSON.stringify({
    schemaVersion: 1,
    windows: [],
    padding: 'a'.repeat(bytes),
  });
}
