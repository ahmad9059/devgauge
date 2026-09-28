// Sanitized, minimal Gemini CLI `/stats model` samples. No credentials, no raw
// transcript, no account identifiers.

export function geminiCliSessionStatsFixture(): string {
  return JSON.stringify({
    cliVersion: '0.5.0',
    capturedAt: '2026-09-28T00:00:00.000Z',
    coverage: 'session',
    windows: [
      {
        key: 'session:gpt-5',
        kind: 'rolling',
        label: 'Session model stats (gpt-5)',
        unit: 'percent',
        used: '37',
      },
    ],
  });
}

export function geminiCliReportedQuotaFixture(): string {
  return JSON.stringify({
    cliVersion: '0.5.0',
    capturedAt: '2026-09-28T00:00:00.000Z',
    coverage: 'reported-quota',
    windows: [
      {
        key: 'quota:code-assist',
        kind: 'daily',
        label: 'Reported Code Assist quota',
        unit: 'requests',
        used: '120',
        limit: '1000',
      },
    ],
  });
}

export function geminiCliMalformedFixture(): string {
  return JSON.stringify({ coverage: 'session' });
}
