import type { ProviderId } from '@/domain/providers';

/**
 * A vendor-owned usage contract. Production capability stays false until every
 * field is recorded and verified; unverified endpoint observations must never be
 * promoted to a live integration (API.md §3.3–3.4).
 */
export type VendorContract = {
  providerId: ProviderId;
  /** Exact vendor-owned base URL, e.g. https://api.vendor.example */
  baseUrl: string;
  /** Vendor-owned usage path, e.g. /v1/usage */
  usagePath: string;
  /** Vendor-owned key-management/revocation page. */
  revocationUrl: string;
  /** Hosts the adapter may contact (from the vendor contract). */
  allowedHosts: string[];
  schemaVersion: number;
  pollingLimitSeconds: number;
  /** The credential can only read usage, not spend or mutate. */
  readOnly: boolean;
  /** Vendor permits third-party client distribution. */
  distributionApproved: boolean;
  verifiedAt: string;
  sourceUrl: string;
};

export type ContractGap =
  | 'missing-field'
  | 'not-read-only'
  | 'distribution-not-approved'
  | 'invalid-url';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isHttpsUrl(value: unknown): boolean {
  if (!isNonEmptyString(value)) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

/** Lists every reason the contract is not ready for production enablement. */
export function contractGaps(
  contract: Partial<VendorContract> | undefined,
): ContractGap[] {
  const source: Partial<VendorContract> = contract ?? {};
  const gaps: ContractGap[] = [];
  const requiredStrings: (keyof VendorContract)[] = [
    'baseUrl',
    'usagePath',
    'revocationUrl',
    'verifiedAt',
    'sourceUrl',
  ];
  for (const field of requiredStrings) {
    if (!isNonEmptyString(source[field])) gaps.push('missing-field');
  }
  if (!Array.isArray(source.allowedHosts) || source.allowedHosts.length === 0) {
    gaps.push('missing-field');
  }
  if (
    typeof source.schemaVersion !== 'number' ||
    typeof source.pollingLimitSeconds !== 'number'
  ) {
    gaps.push('missing-field');
  }
  if (!isHttpsUrl(source.baseUrl) || !isHttpsUrl(source.revocationUrl)) {
    gaps.push('invalid-url');
  }
  if (source.readOnly !== true) gaps.push('not-read-only');
  if (source.distributionApproved !== true) {
    gaps.push('distribution-not-approved');
  }
  return [...new Set(gaps)];
}

export function isContractVerified(
  contract: Partial<VendorContract> | undefined,
): contract is VendorContract {
  return contract !== undefined && contractGaps(contract).length === 0;
}

export function experimentalUsageUrl(contract: VendorContract): string {
  const base = contract.baseUrl.replace(/\/$/, '');
  const path = contract.usagePath.startsWith('/')
    ? contract.usagePath
    : `/${contract.usagePath}`;
  return `${base}${path}`;
}

export function userAgentHeader(version = '0.1.0'): string {
  return `devgauge/${version}`;
}
