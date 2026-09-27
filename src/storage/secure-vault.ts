import type { ProviderId } from '@/domain/providers';

import type { SecretStore } from './secret-store';

export const CREDENTIAL_KINDS = ['oauth', 'api-key'] as const;
export type CredentialKind = (typeof CREDENTIAL_KINDS)[number];

export const CREDENTIAL_REF_SUFFIXES = [
  'oauth',
  'api-key',
  'refresh-token',
] as const;
export type CredentialRefSuffix = (typeof CREDENTIAL_REF_SUFFIXES)[number];

/** Small, versioned credential record. Never contains cookies or passwords. */
export type CredentialRecord = {
  version: 1;
  kind: CredentialKind;
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  expiresAt?: string;
  grantedPermissions?: string[];
};

export function buildCredentialRef(
  providerId: ProviderId,
  connectionId: string,
  suffix: CredentialRefSuffix,
): string {
  if (connectionId.length === 0 || connectionId.includes('.')) {
    throw new Error('connectionId must be non-empty and contain no dots');
  }
  return `provider.${providerId}.connection.${connectionId}.${suffix}`;
}

export function parseCredentialRef(
  ref: string,
): { providerId: string; connectionId: string; suffix: string } | null {
  const parts = ref.split('.');
  if (
    parts.length !== 5 ||
    parts[0] !== 'provider' ||
    parts[2] !== 'connection'
  ) {
    return null;
  }
  return { providerId: parts[1], connectionId: parts[3], suffix: parts[4] };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/** Rejects malformed records before they reach the Keystore. */
export function validateCredentialRecord(value: unknown): CredentialRecord {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Credential record must be an object');
  }
  const record = value as Record<string, unknown>;
  if (record.version !== 1) {
    throw new Error('Unsupported credential record version');
  }
  if (
    typeof record.kind !== 'string' ||
    !(CREDENTIAL_KINDS as readonly string[]).includes(record.kind)
  ) {
    throw new Error('Unsupported credential kind');
  }
  for (const field of ['accessToken', 'refreshToken', 'apiKey', 'expiresAt']) {
    if (record[field] !== undefined && !isNonEmptyString(record[field])) {
      throw new Error(`Credential field ${field} must be a non-empty string`);
    }
  }
  if (record.grantedPermissions !== undefined) {
    if (
      !Array.isArray(record.grantedPermissions) ||
      record.grantedPermissions.some((item) => !isNonEmptyString(item))
    ) {
      throw new Error('grantedPermissions must be an array of strings');
    }
  }
  if (record.kind === 'api-key' && !isNonEmptyString(record.apiKey)) {
    throw new Error('api-key records require apiKey');
  }
  if (record.kind === 'oauth' && !isNonEmptyString(record.accessToken)) {
    throw new Error('oauth records require accessToken');
  }
  return record as CredentialRecord;
}

export interface SecureVault {
  save(ref: string, record: CredentialRecord): Promise<void>;
  load(ref: string): Promise<CredentialRecord | null>;
  remove(ref: string): Promise<void>;
}

export function createSecureVault(store: SecretStore): SecureVault {
  return {
    async save(ref, record) {
      const validated = validateCredentialRecord(record);
      await store.set(ref, JSON.stringify(validated));
    },
    async load(ref) {
      const raw = await store.get(ref);
      if (raw === null) return null;
      try {
        return validateCredentialRecord(JSON.parse(raw));
      } catch {
        // Fail closed: a corrupt/foreign record is treated as absent.
        await store.delete(ref);
        return null;
      }
    },
    async remove(ref) {
      await store.delete(ref);
    },
  };
}
