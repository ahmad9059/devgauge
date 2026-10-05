import { describe, expect, it, vi } from 'vitest';
import { parseHeadlessCapture } from './headless-session';
vi.mock('expo', () => ({ requireNativeModule: vi.fn() }));

const now = new Date('2026-10-05T00:00:00Z');
const message = (data: object) => JSON.stringify({ runId: 1, ...data });

describe('headless first-party session capture', () => {
  it('uses fresh page percentages over API aliases and keeps both reset labels', () => {
    const windows = parseHeadlessCapture(
      'codex',
      [
        message({
          type: 'usage',
          url: 'https://chatgpt.com/backend-api/usage',
          body: JSON.stringify({
            primary_window: { used_percent: 80 },
            secondary_window: { used_percent: 90 },
          }),
        }),
        message({
          type: 'text',
          text: '5-hour usage limit\n60% left\nResets in 2h37m\nWeekly usage limit\n57% left\nResets in 2 days',
        }),
      ],
      now,
    );
    expect(windows.map((window) => window.used)).toEqual(['40', '43']);
    expect(windows.map((window) => window.resetsAt)).toEqual([
      '2026-10-05T02:37:00.000Z',
      '2026-10-07T00:00:00.000Z',
    ]);
  });
  it('rejects wrong attempts, malformed messages and cross-origin quota responses', () => {
    expect(
      parseHeadlessCapture(
        'codex',
        [
          'not JSON',
          message({ runId: 0, type: 'text', text: 'Weekly\n40% left' }),
          message({
            type: 'usage',
            url: 'https://unrelated.test/usage',
            body: '{"primary":{"used_percent":50}}',
          }),
          message({
            type: 'usage',
            url: 'https://chatgpt.com/history',
            body: '{"primary":{"used_percent":50}}',
          }),
        ],
        now,
      ),
    ).toEqual([]);
  });
});
