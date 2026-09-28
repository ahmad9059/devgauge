// Sanitized candidate fixtures for Command Code. No API keys or account ids.

export function commandCodeSuccessFixture(): string {
  return JSON.stringify({
    fetchedAt: '2026-09-28T00:00:00.000Z',
    windows: [
      {
        key: 'five-hour',
        kind: 'rolling',
        label: '5-hour window',
        unit: 'credits',
        used: '12',
        limit: '50',
        resetsAt: '2026-09-28T05:00:00.000Z',
      },
      {
        key: 'weekly',
        kind: 'weekly',
        label: 'Weekly credits',
        unit: 'credits',
        used: '74',
        limit: '200',
      },
    ],
  });
}

export function commandCodePartialFixture(): string {
  return JSON.stringify({
    partial: true,
    windows: [
      {
        key: 'weekly',
        kind: 'weekly',
        label: 'Weekly credits',
        unit: 'credits',
        used: '74',
      },
    ],
  });
}

export function commandCodeMalformedFixture(): string {
  return JSON.stringify({
    windows: [
      { key: 'weekly', kind: 'fortnightly', label: 'x', unit: 'credits' },
    ],
  });
}
