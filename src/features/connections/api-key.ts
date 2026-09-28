export type ApiKeyValidation = { ok: true } | { ok: false; reason: string };

export const MASKED_API_KEY = '••••••••';

/** Format-only validation. Provider identity/usage validation happens on connect. */
export function validateApiKey(value: unknown): ApiKeyValidation {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return { ok: false, reason: 'API key is required.' };
  }
  const trimmed = value.trim();
  if (trimmed.length < 8)
    return { ok: false, reason: 'That key looks too short.' };
  if (trimmed.length > 512)
    return { ok: false, reason: 'That key looks too long.' };
  if (/\s/.test(trimmed))
    return { ok: false, reason: 'API keys do not contain spaces.' };
  return { ok: true };
}

/** Masked display value. Never reveals the middle of the key. */
export function maskApiKey(value: string): string {
  if (value.length <= 8) return MASKED_API_KEY;
  return `${value.slice(0, 4)}${MASKED_API_KEY}${value.slice(-2)}`;
}

export type ApiKeyRiskLevel = 'read-only' | 'broad';

/**
 * A key is only "read-only" when the vendor contract confirms it. Unknown keys
 * are treated as broad, because they may permit spending.
 */
export function apiKeyRiskLevel(contract?: {
  readOnly?: boolean;
}): ApiKeyRiskLevel {
  return contract?.readOnly === true ? 'read-only' : 'broad';
}

export function requiresBroadKeyAcceptance(contract?: {
  readOnly?: boolean;
}): boolean {
  return apiKeyRiskLevel(contract) === 'broad';
}
