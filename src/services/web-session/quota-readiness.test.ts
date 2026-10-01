import { describe, expect, it } from 'vitest';
import { deriveWindow, type UsageWindowKind } from '@/domain/usage';
import { isQuotaReady } from './quota-readiness';

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
