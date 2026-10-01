import { describe, expect, it } from 'vitest';
import { deriveWindow, type UsageWindowKind } from '@/domain/usage';
import {
  isQuotaReady,
  needsResetTiming,
  needsWorkspaceCapture,
} from './quota-readiness';

function window(kind: UsageWindowKind) {
  return deriveWindow({
    externalKey: kind,
    kind,
    label: kind,
    used: '1',
    limit: '100',
    unit: 'percent',
    derivation: 'provider',
  });
}
describe('verified quota capture completion', () => {
  it('discovers Codex workspace credits on a fresh page without requiring them for personal accounts', () => {
    const windows = [window('rolling'), window('weekly')];
    const input = {
      mode: 'api' as const,
      windows,
      pageWindows: [],
      expectsMonthly: false,
    };
    expect(needsWorkspaceCapture(input)).toBe(true);
    expect(
      needsWorkspaceCapture({ ...input, mode: 'page', pageWindows: windows }),
    ).toBe(false);
    expect(
      needsWorkspaceCapture({
        ...input,
        mode: 'page',
        pageWindows: windows,
        expectsMonthly: true,
      }),
    ).toBe(true);
    expect(
      needsWorkspaceCapture({
        ...input,
        windows: [...windows, window('monthly')],
        expectsMonthly: true,
      }),
    ).toBe(false);
  });
  it('waits for missing Claude main reset labels but accepts raw provider dates and optional omissions', () => {
    const session = { ...window('rolling'), externalKey: 'session.five_hour' };
    const weekly = {
      ...window('weekly'),
      externalKey: 'session.seven_day',
      resetsSourceText: 'Fri at 10:00 AM',
    };
    expect(needsResetTiming('claude', [session, weekly])).toBe(true);
    expect(needsResetTiming('codex', [session, weekly])).toBe(true);
    expect(
      needsResetTiming('claude', [
        { ...session, resetsAt: '2026-10-01T09:00:00Z' },
        weekly,
        { ...window('weekly'), externalKey: 'session.seven_day_opus' },
      ]),
    ).toBe(false);
  });
  it.each(['codex', 'command-code', 'github-copilot'] as const)(
    'waits for %s reset text instead of completing a quota-only capture',
    (providerId) => {
      const monthly = window('monthly');
      expect(needsResetTiming(providerId, [monthly])).toBe(true);
      expect(
        needsResetTiming(providerId, [
          { ...monthly, resetsSourceText: 'Nov 1, 2026 5:00 AM' },
        ]),
      ).toBe(false);
      expect(
        needsResetTiming(providerId, [
          { ...monthly, resetsAt: '2026-11-01T00:00:00Z' },
        ]),
      ).toBe(false);
    },
  );
  it('accepts both Codex API windows without waiting for DOM reset labels', () => {
    expect(isQuotaReady('codex', [window('rolling'), window('weekly')])).toBe(
      true,
    );
    expect(isQuotaReady('codex', [window('rolling')])).toBe(false);
  });
  it('requires all known Command Code windows and rejects empty quota data', () => {
    expect(
      isQuotaReady('command-code', [window('rolling'), window('weekly')]),
    ).toBe(false);
    expect(
      isQuotaReady('command-code', [
        window('rolling'),
        window('weekly'),
        window('monthly'),
      ]),
    ).toBe(true);
    expect(isQuotaReady('claude', [])).toBe(false);
  });
});
