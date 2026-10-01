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

  it('keeps explicit Codex API used percentages and preserves timestamp resets', () => {
    const raw = extractRawWindows(
      [
        {
          url: 'https://chatgpt.com/backend-api/usage',
          body: JSON.stringify({
            primary_window: { used_percent: 23, reset_at: 1_791_234_567 },
            secondary_window: { used_percent: 13, reset_at: 1_791_567_890 },
          }),
        },
      ],
      codex,
    );
    const windows = toDomainWindows(raw, codex);
    expect(windows.find((w) => w.label === '5-hour window')?.used).toBe('23');
    expect(windows.find((w) => w.label === 'Weekly')?.used).toBe('13');
    expect(windows.find((w) => w.label === '5-hour window')?.resetsAt).toBe(
      '2026-10-05T21:09:27.000Z',
    );
  });

  it('keeps used-percent payloads (Claude utilization)', () => {
    const raw = extractRawWindows(
      [
        {
          url: 'x',
          body: JSON.stringify({ five_hour: { utilization: 42 } }),
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
  it('keeps reset durations and credit values inside their existing section', () => {
    const claude = SESSION_PROVIDERS.claude.keyMap;
    const raw = parseUsageText(
      'Weekly limits\n24% used\nResets in 5 hours',
      claude,
    );
    expect(raw).toEqual([
      { key: 'seven_day', usedPercent: 24, resetsAt: 'in 5 hours' },
    ]);
    const credits = parseUsageText(
      'Included credits\n0% used\nResets on Nov 1\n0 of 200 AI credits used',
      github,
    );
    expect(credits).toHaveLength(1);
    expect(credits[0]).toMatchObject({
      key: 'credits',
      resetsAt: 'on Nov 1',
      used: 0,
      limit: 200,
    });
  });
  it('captures Codex workspace monthly credits and reset text alongside its main windows', () => {
    const text = [
      '5 hour usage limit',
      '0% remaining',
      'Weekly usage limit',
      '67% remaining',
      'Workspace monthly credit limit',
      '62% remaining',
      'Resets Nov 1, 2026 5:00 AM378 of 1,000 credits used',
    ].join('\n');
    const windows = toDomainWindows(parseUsageText(text, codex), codex);
    expect(windows.map((w) => w.kind)).toEqual([
      'rolling',
      'weekly',
      'monthly',
    ]);
    const monthly = windows.find((w) => w.kind === 'monthly');
    expect(monthly).toMatchObject({
      used: '378',
      limit: '1000',
      unit: 'credits',
      utilization: 0.378,
      resetsSourceText: 'Nov 1, 2026 5:00 AM',
      resetsAt: null,
    });
  });
  it('shows Codex monthly percentages when exact credit counts are absent without inventing a workspace bar', () => {
    const monthly = toDomainWindows(
      parseUsageText('Workspace monthly credit limit\n62% remaining', codex),
      codex,
    )[0];
    expect(monthly).toMatchObject({
      used: '38',
      limit: '100',
      unit: 'percent',
    });
    expect(
      parseUsageText(
        '5 hour usage limit\n62% remaining\nWeekly usage limit\n67% remaining',
        codex,
      ),
    ).toHaveLength(2);
  });
  it('reads Claude reset labels before percentages without mixing session and weekly limits', () => {
    const keyMap = SESSION_PROVIDERS.claude.keyMap;
    const text = [
      'Current session',
      'Resets in 2 hr 30 min',
      '24% used',
      'Weekly limits',
      'All models',
      'Resets Fri at 10:00 AM',
      '24% used',
      'Sonnet only',
      'Resets Sat at 9:00 AM',
      '12% used',
    ].join('\n');
    const windows = toDomainWindows(
      parseUsageText(text, keyMap),
      keyMap,
      new Date('2026-10-01T05:00:00Z'),
    );
    expect(windows.find((w) => w.kind === 'rolling')?.resetsAt).toBe(
      '2026-10-01T07:30:00.000Z',
    );
    expect(windows.find((w) => w.label === 'Weekly')?.resetsSourceText).toBe(
      'Fri at 10:00 AM',
    );
    expect(
      windows.find((w) => w.label === 'Weekly (Sonnet)')?.resetsSourceText,
    ).toBe('Sat at 9:00 AM');
    expect(
      windows.find((w) => w.label === 'Weekly (Sonnet)')?.resetsAt,
    ).toBeNull();
  });
  it('does not attach a new section reset to the preceding quota without a reset', () => {
    const keyMap = SESSION_PROVIDERS.claude.keyMap;
    const raw = parseUsageText(
      'Current session\n24% used\nWeekly limits\nResets in 2 days\n24% used',
      keyMap,
    );
    expect(raw.map((w) => w.resetsAt)).toEqual([null, 'in 2 days']);
  });
  it('treats bare Codex page values as remaining without double-inverting explicit qualifiers', () => {
    for (const suffix of ['', ' remaining', '\nremaining']) {
      const text = `5 hour usage limit\n100%${suffix}\nWeekly usage limit\n86%${suffix}`;
      const windows = toDomainWindows(parseUsageText(text, codex), codex);
      expect(windows.find((w) => w.kind === 'rolling')?.used).toBe('0');
      expect(windows.find((w) => w.kind === 'weekly')?.used).toBe('14');
    }
    expect(
      parseUsageText('Weekly usage limit\n14% used', codex)[0].usedPercent,
    ).toBe(14);
  });
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

  it('inverts Codex remaining values split across text nodes', () => {
    const text = ['Weekly usage limit', '89%', 'remaining'].join('\n');
    const windows = toDomainWindows(parseUsageText(text, codex), codex);
    expect(windows.find((w) => w.label === 'Weekly')?.used).toBe('11');
  });

  it('keeps Codex absolute reset dates for both quota windows', () => {
    const text = [
      '5 hour usage limit',
      '42% remaining',
      'Resets Oct 1, 2026 12:29 AM',
      'Weekly usage limit',
      '89% remaining',
      'Resets Oct 5, 2026 9:02 PM',
    ].join('\n');
    const windows = toDomainWindows(parseUsageText(text, codex), codex);
    expect(
      windows.find((w) => w.label === '5-hour window')?.resetsSourceText,
    ).toBe('Oct 1, 2026 12:29 AM');
    expect(windows.find((w) => w.label === 'Weekly')?.resetsSourceText).toBe(
      'Oct 5, 2026 9:02 PM',
    );
  });

  it('reads Codex reset labels split from their date values', () => {
    const text = [
      '5 hour usage limit',
      '42% remaining',
      'Resets',
      'Oct 1, 2026 12:29 AM',
      'Weekly usage limit',
      '88%',
      'remaining',
      'Resets',
      'Oct 5, 2026 9:02 PM',
    ].join('\n');
    const windows = toDomainWindows(parseUsageText(text, codex), codex);
    expect(windows.find((w) => w.label === '5-hour window')?.used).toBe('58');
    expect(
      windows.find((w) => w.label === '5-hour window')?.resetsSourceText,
    ).toBe('Oct 1, 2026 12:29 AM');
    expect(windows.find((w) => w.label === 'Weekly')?.used).toBe('12');
    expect(windows.find((w) => w.label === 'Weekly')?.resetsSourceText).toBe(
      'Oct 5, 2026 9:02 PM',
    );
  });

  it('reads included credits fractions (GitHub)', () => {
    const text = [
      'Included credits',
      '23 / 200 AI credits',
      'Resets in 2 days',
    ].join('\n');
    const raw = parseUsageText(text, github);
    const windows = toDomainWindows(raw, github);
    expect(windows[0]?.used).toBe('23');
    expect(windows[0]?.unit).toBe('credits');
    expect(windows[0]?.limit).toBe('200');
    expect(windows[0]?.utilization).toBe(0.115);
    expect(windows[0]?.resetsAt).toBeNull();
    expect(windows[0]?.resetsSourceText).toBe('in 2 days');
  });

  it('reads bare percentages under headings (Command Code)', () => {
    const keyMap = SESSION_PROVIDERS['command-code'].keyMap;
    const text = [
      '5-HOUR LIMIT',
      '1%',
      'Resets in 4h 41m',
      'WEEKLY LIMIT',
      '89%',
      'Resets in 1d',
      'MONTHLY LIMIT',
      '78%',
      'Resets on Oct 15',
    ].join('\n');
    const windows = toDomainWindows(parseUsageText(text, keyMap), keyMap);
    const byLabel = Object.fromEntries(windows.map((w) => [w.label, w.used]));
    expect(byLabel['5-hour window']).toBe('1');
    expect(byLabel['Weekly']).toBe('89');
    expect(byLabel['Monthly']).toBe('78');
  });
});
