import { describe, expect, it } from 'vitest';
import { canUseMarketing } from './marketing-policy';

describe('marketing isolation', () => {
  it('allows labeled samples only in the isolated preview package', () => {
    expect(canUseMarketing('preview', true, 'app.devgauge.marketing')).toBe(
      true,
    );
  });
  it('cannot seed the production or regular preview application', () => {
    for (const variant of ['production', 'development', undefined]) {
      expect(canUseMarketing(variant, true, 'app.devgauge.marketing')).toBe(
        false,
      );
    }
    for (const packageId of [
      'app.devgauge',
      'app.devgauge.preview',
      undefined,
    ]) {
      expect(canUseMarketing('preview', true, packageId)).toBe(false);
    }
    for (const flag of [false, 'true', undefined]) {
      expect(canUseMarketing('preview', flag, 'app.devgauge.marketing')).toBe(
        false,
      );
    }
  });
});
