import { normalizeResetTime } from '@/domain/reset-time';

export type EarnedResetOffer = {
  id: string;
  status: string;
  resetType: string;
  expiresAt: string | null;
  title: string | null;
  description: string | null;
};
export type EarnedResetAvailability = {
  state: 'unknown' | 'none' | 'available' | 'expired';
  availableCount: number | null;
  /** null means count-only; [] means the provider returned empty details. */
  offers: EarnedResetOffer[] | null;
};

/** Only the documented app-server field is accepted; no website-schema guessing. */
export function parseCodexEarnedResets(
  value: unknown,
  now: Date,
): EarnedResetAvailability {
  const unknown: EarnedResetAvailability = {
    state: 'unknown',
    availableCount: null,
    offers: null,
  };
  if (!value || typeof value !== 'object') return unknown;
  const input = value as Record<string, unknown>;
  if (
    !Number.isInteger(input.availableCount) ||
    Number(input.availableCount) < 0
  )
    return unknown;
  const availableCount = Number(input.availableCount);
  let offers: EarnedResetOffer[] | null = null;
  if (Array.isArray(input.credits)) {
    offers = [];
    for (const item of input.credits) {
      if (!item || typeof item !== 'object') return unknown;
      const row = item as Record<string, unknown>;
      if (
        typeof row.id !== 'string' ||
        !row.id ||
        typeof row.status !== 'string' ||
        typeof row.resetType !== 'string'
      )
        return unknown;
      const expiresAt =
        row.expiresAt == null ? null : normalizeResetTime(row.expiresAt);
      if (row.expiresAt != null && !expiresAt) return unknown;
      offers.push({
        id: row.id,
        status: row.status,
        resetType: row.resetType,
        expiresAt,
        title: typeof row.title === 'string' ? row.title : null,
        description:
          typeof row.description === 'string' ? row.description : null,
      });
    }
  } else if (input.credits !== null && input.credits !== undefined)
    return unknown;
  const expired =
    availableCount === 0 &&
    !!offers?.length &&
    offers.every(
      (offer) =>
        offer.status === 'expired' ||
        (offer.expiresAt !== null &&
          Date.parse(offer.expiresAt) <= now.getTime()),
    );
  return {
    state: availableCount > 0 ? 'available' : expired ? 'expired' : 'none',
    availableCount,
    offers,
  };
}

export type CodexResetOutcome =
  'reset' | 'alreadyRedeemed' | 'nothingToReset' | 'noCredit';
export function parseCodexResetOutcome(
  value: unknown,
): CodexResetOutcome | null {
  if (!value || typeof value !== 'object') return null;
  const outcome = (value as Record<string, unknown>).outcome;
  return outcome === 'reset' ||
    outcome === 'alreadyRedeemed' ||
    outcome === 'nothingToReset' ||
    outcome === 'noCredit'
    ? outcome
    : null;
}
