import type { ProviderId } from './providers';
import {
  addDecimal,
  canonicalizeDecimal,
  compareDecimal,
  decimalToNumber,
  isZeroDecimal,
  subtractDecimal,
  type DecimalString,
} from './decimal';

export const USAGE_UNITS = [
  'percent',
  'requests',
  'credits',
  'tokens',
  'currency',
] as const;
export type UsageUnit = (typeof USAGE_UNITS)[number];

export const USAGE_WINDOW_KINDS = [
  'rolling',
  'daily',
  'weekly',
  'monthly',
  'billing',
] as const;
export type UsageWindowKind = (typeof USAGE_WINDOW_KINDS)[number];

export type Derivation = 'provider' | 'documented-rule' | 'manual';

export type UsageWindow = {
  externalKey: string;
  kind: UsageWindowKind;
  label: string;
  /** null means the provider did not supply consumption; never zero. */
  used: DecimalString | null;
  /** null means unavailable; never "unlimited". */
  limit: DecimalString | null;
  remaining: DecimalString | null;
  /** Ratio where 1 = 100%; may exceed 1 for honest over-cap reporting. */
  utilization: number | null;
  unit: UsageUnit;
  currencyCode: string | null;
  periodStartsAt: string | null;
  periodEndsAt: string | null;
  resetsAt: string | null;
  resetsSourceText?: string | null;
  derivation: Derivation;
};

export type UsageSnapshot = {
  providerId: ProviderId;
  connectionId: string;
  fetchedAt: string;
  source: 'live' | 'manual';
  schemaVersion: number;
  isPartial: boolean;
  windows: UsageWindow[];
  safeRequestId?: string;
};

export type AccountIdentity = {
  externalId: string | null;
  displayName: string | null;
  accountHint: string | null;
  scope: 'personal' | 'organization' | 'workspace';
};

export type WindowInput = {
  externalKey: string;
  kind: UsageWindowKind;
  label: string;
  used?: DecimalString | null;
  limit?: DecimalString | null;
  remaining?: DecimalString | null;
  unit: UsageUnit;
  currencyCode?: string | null;
  periodStartsAt?: string | null;
  periodEndsAt?: string | null;
  resetsAt?: string | null;
  resetsSourceText?: string | null;
  derivation: Derivation;
};

/**
 * Computes remaining and utilization from what the provider supplied, without
 * inventing values: unknown stays null, and remaining is only derived when the
 * units match and the limit is known and not exceeded.
 */
export function deriveWindow(input: WindowInput): UsageWindow {
  const used = input.used == null ? null : canonicalizeDecimal(input.used);
  const limit = input.limit == null ? null : canonicalizeDecimal(input.limit);

  let remaining =
    input.remaining == null ? null : canonicalizeDecimal(input.remaining);
  if (remaining === null && used !== null && limit !== null) {
    if (compareDecimal(limit, used) >= 0) {
      remaining = subtractDecimal(limit, used);
    }
  }

  let utilization: number | null = null;
  if (used !== null && limit !== null && !isZeroDecimal(limit)) {
    utilization = decimalToNumber(used) / decimalToNumber(limit);
  }

  return {
    externalKey: input.externalKey,
    kind: input.kind,
    label: input.label,
    used,
    limit,
    remaining,
    utilization,
    unit: input.unit,
    currencyCode: input.currencyCode ?? null,
    periodStartsAt: input.periodStartsAt ?? null,
    periodEndsAt: input.periodEndsAt ?? null,
    resetsAt: input.resetsAt ?? null,
    resetsSourceText: input.resetsSourceText ?? null,
    derivation: input.derivation,
  };
}

/** Adds quantities only when both are known and non-null. */
export function addKnown(
  a: DecimalString | null,
  b: DecimalString | null,
): DecimalString | null {
  return a !== null && b !== null ? addDecimal(a, b) : null;
}
