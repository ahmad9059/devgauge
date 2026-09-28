import { describe, expect, it } from 'vitest';

import {
  contractGaps,
  experimentalUsageUrl,
  isContractVerified,
  type VendorContract,
} from '@/providers/experimental/contract';

export const completeContract: VendorContract = {
  providerId: 'command-code',
  baseUrl: 'https://api.vendor.test',
  usagePath: '/v1/usage',
  revocationUrl: 'https://api.vendor.test/keys',
  allowedHosts: ['api.vendor.test'],
  schemaVersion: 1,
  pollingLimitSeconds: 60,
  readOnly: true,
  distributionApproved: true,
  verifiedAt: '2026-09-28T00:00:00.000Z',
  sourceUrl: 'https://api.vendor.test/docs',
};

describe('vendor contract gate', () => {
  it('rejects an empty contract with explicit gaps', () => {
    const gaps = contractGaps({});
    expect(gaps).toContain('missing-field');
    expect(gaps).toContain('not-read-only');
    expect(gaps).toContain('distribution-not-approved');
    expect(isContractVerified(undefined)).toBe(false);
  });

  it('accepts only a complete, read-only, distribution-approved contract', () => {
    expect(isContractVerified(completeContract)).toBe(true);
    expect(contractGaps(completeContract)).toEqual([]);
    expect(isContractVerified({ ...completeContract, readOnly: false })).toBe(
      false,
    );
    expect(
      isContractVerified({ ...completeContract, distributionApproved: false }),
    ).toBe(false);
    expect(
      isContractVerified({
        ...completeContract,
        baseUrl: 'http://insecure.test',
      }),
    ).toBe(false);
  });

  it('builds the vendor usage URL from the contract', () => {
    expect(experimentalUsageUrl(completeContract)).toBe(
      'https://api.vendor.test/v1/usage',
    );
    expect(
      experimentalUsageUrl({
        ...completeContract,
        baseUrl: 'https://api.vendor.test/',
        usagePath: 'v1/usage',
      }),
    ).toBe('https://api.vendor.test/v1/usage');
  });
});
