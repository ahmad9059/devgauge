import { describe, expect, it } from 'vitest';

import { canUseDiagnostics } from './diagnostics';

describe('Android test diagnostics gate', () => {
  it('allows development builds and explicit internal preview builds', () => {
    expect(canUseDiagnostics(true, 'development', undefined)).toBe(true);
    expect(canUseDiagnostics(false, 'preview', '1')).toBe(true);
  });

  it('never exposes diagnostics on a production build', () => {
    expect(canUseDiagnostics(false, 'production', '1')).toBe(false);
    expect(canUseDiagnostics(false, 'preview', undefined)).toBe(false);
  });
});
