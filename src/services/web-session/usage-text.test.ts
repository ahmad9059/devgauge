import { describe, expect, it } from 'vitest';

import {
  extractRawWindows,
  toDomainWindows,
} from '@/services/web-session/usage-extract';
import { SESSION_PROVIDERS } from '@/services/web-session/session-config';
import { parseUsageText } from '@/services/web-session/usage-text';

const codex = SESSION_PROVIDERS.codex.keyMap;
const github = SESSION_PROVIDERS['github-copilot'].keyMap;

describe('remaining vs used', () => {
  it('inverts remaining-percent payloads (Codex)', () => {
    const raw = extractRawWindows(
      [
        {
          url: 'https://chatgpt.com/backend-api/usage',
          body: JSON.stringify({
            primary: {
              remaining_percent: 100,
              resets_at: '2026-09-29T05:00:00.000Z',
            },
            secondary: { remaining_percent: 99 },
          }),
        },
      ],
      codex,
    );
    const windows = toDomainWindows(raw, codex);
    const fiveHour = windows.find((w) => w.label === '5-hour window');
    const weekly = windows.find((w) => w.label === 'Weekly');
    expect(fiveHour?.used).toBe('0');
    expect(weekly?.used).toBe('1');
    expect(fiveHour?.resetsAt).toBe('2026-09-29T05:00:00.000Z');
  });

  it('keeps used-percent payloads (Claude utilization)', () => {
    const raw = extractRawWindows(
      [
        {
          url: 'x',
          body: JSON.stringify({ five_hour: { utilization: 0.42 } }),
        },
      ],
      SESSION_PROVIDERS.claude.keyMap,
    );
    expect(toDomainWindows(raw, SESSION_PROVIDERS.claude.keyMap)[0].used).toBe(
      '42',
    );
  });
});

describe('page text parsing', () => {
  it('reads remaining percentages under section headings (Codex)', () => {
    const text = [
      '5 hour usage limit',
      '100% remaining',
      'Resets Oct 5, 2026 9:02 PM',
      'Weekly usage limit',
      '99% remaining',
      'Resets in 2 days',
    ].join('\n');
    const raw = parseUsageText(text, codex);
    const windows = toDomainWindows(raw, codex);
    expect(windows.find((w) => w.label === '5-hour window')?.used).toBe('0');
    expect(windows.find((w) => w.label === 'Weekly')?.used).toBe('1');
  });

  it('reads included credits fractions (GitHub)', () => {
    const text = [
      'Included credits',
      '23 / 200 AI credits',
      'Resets in 2 days',
    ].join('\n');
    const raw = parseUsageText(text, github);
    const windows = toDomainWindows(raw, github);
    expect(windows[0]?.used).toBe('11.5');
    expect(windows[0]?.resetsAt).toBe('in 2 days');
  });
});
