import { describe, expect, it } from 'vitest';

import { canActivatePartnerApi } from '@/services/capabilities/partner';

describe('partner api capability', () => {
  it('cannot activate through a manifest flag alone', () => {
    expect(
      canActivatePartnerApi({
        manifestAllows: true,
        appVersion: '2.0.0',
        minimumAppVersion: '1.0.0',
        contractReviewed: false,
      }),
    ).toBe(false);
  });

  it('requires a reviewed contract and a supporting app version', () => {
    expect(
      canActivatePartnerApi({
        manifestAllows: true,
        appVersion: '0.9.0',
        minimumAppVersion: '1.0.0',
        contractReviewed: true,
      }),
    ).toBe(false);
    expect(
      canActivatePartnerApi({
        manifestAllows: true,
        appVersion: '1.0.0',
        minimumAppVersion: '1.0.0',
        contractReviewed: true,
      }),
    ).toBe(true);
  });
});
