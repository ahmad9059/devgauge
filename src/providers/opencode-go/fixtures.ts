// Sanitized candidate fixtures for OpenCode Go. No API keys or account ids.

export function openCodeGoSuccessFixture(): string {
  return JSON.stringify({
    fetchedAt: '2026-09-28T00:00:00.000Z',
    windows: [
      {
        key: 'model:gpt-5:monthly',
        kind: 'monthly',
        label: 'Monthly allowance (gpt-5)',
        unit: 'percent',
        used: '46',
        limit: '100',
      },
      {
        key: 'billing-period',
        kind: 'billing',
        label: 'Billing period',
        unit: 'currency',
        used: '18.5',
        limit: '40',
        currencyCode: 'USD',
      },
    ],
  });
}

export function openCodeGoPartialFixture(): string {
  return JSON.stringify({
    partial: true,
    windows: [
      {
        key: 'model:gpt-5:monthly',
        kind: 'monthly',
        label: 'Monthly allowance (gpt-5)',
        unit: 'percent',
        used: '46',
      },
    ],
  });
}

export function openCodeGoMalformedFixture(): string {
  return JSON.stringify({
    windows: [{ key: 'x', kind: 'hourly', label: 'x', unit: 'percent' }],
  });
}
