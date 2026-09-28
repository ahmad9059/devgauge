import {
  addDecimal,
  canonicalizeDecimal,
  isDecimalString,
} from '@/domain/decimal';
import { deriveWindow, type UsageUnit } from '@/domain/usage';
import type { NormalizedUsageResult } from '@/providers/types';

import type { GitHubAccountScope, GitHubBillingKind } from './client';
import type { RawBillingUsage } from './schema';

function toDecimalString(value: number | string | undefined): string | null {
  if (value === undefined) return null;
  if (typeof value === 'string') {
    return isDecimalString(value) ? canonicalizeDecimal(value) : null;
  }
  if (!Number.isFinite(value) || value < 0) return null;
  return canonicalizeDecimal(String(value));
}

function resolveUnit(
  unitType: string | undefined,
  kind: GitHubBillingKind,
): { unit: UsageUnit; monetary: boolean } {
  const value = (unitType ?? '').toLowerCase();
  if (value.includes('request')) return { unit: 'requests', monetary: false };
  if (value.includes('credit')) return { unit: 'credits', monetary: false };
  if (value.includes('token')) return { unit: 'tokens', monetary: false };
  if (
    value.includes('usd') ||
    value.includes('dollar') ||
    value.includes('currency') ||
    value.includes('amount')
  ) {
    return { unit: 'currency', monetary: true };
  }
  // Never convert a billing amount into counts: fall back to the endpoint's
  // native unit and let the raw consumption field decide.
  return kind === 'premium_request'
    ? { unit: 'requests', monetary: false }
    : { unit: 'credits', monetary: false };
}

function periodKey(raw: RawBillingUsage): string {
  const period = raw.timePeriod ?? raw.billingPeriod;
  if (period) return `${period.year}-${String(period.month).padStart(2, '0')}`;
  return 'current';
}

function labelFor(kind: GitHubBillingKind, scope: GitHubAccountScope): string {
  const base = kind === 'premium_request' ? 'Premium requests' : 'AI credits';
  return scope === 'organization' ? `${base} (organization)` : base;
}

/**
 * Normalizes one GitHub billing usage response. GitHub reports consumption, not
 * an entitlement cap, so `limit` is always null (never zero or unlimited).
 */
export function normalizeGitHubBilling(
  raw: RawBillingUsage,
  options: {
    scope: GitHubAccountScope;
    owner: string;
    kind: GitHubBillingKind;
    now: string;
    schemaVersion?: number;
  },
): NormalizedUsageResult {
  const firstItem = raw.usageItems[0];
  const { unit, monetary } = resolveUnit(firstItem?.unitType, options.kind);

  let used: string | null = null;
  for (const item of raw.usageItems) {
    const value = monetary
      ? toDecimalString(item.netAmount)
      : toDecimalString(item.quantity);
    if (value === null) continue;
    used = used === null ? value : addDecimal(used, value);
  }

  const window = deriveWindow({
    externalKey: `github.${options.scope}.${options.owner}.${options.kind}.${periodKey(raw)}`,
    kind: raw.timePeriod || raw.billingPeriod ? 'monthly' : 'billing',
    label: labelFor(options.kind, options.scope),
    used,
    // GitHub usage responses do not expose the entitlement cap.
    limit: null,
    unit,
    currencyCode: unit === 'currency' ? 'USD' : null,
    periodStartsAt: null,
    periodEndsAt: null,
    resetsAt: null,
    derivation: 'provider',
  });

  return {
    identity: {
      externalId: options.owner,
      displayName: options.owner,
      accountHint: null,
      scope: options.scope,
    },
    fetchedAt: options.now,
    schemaVersion: options.schemaVersion ?? 1,
    isPartial: false,
    windows: [window],
  };
}
