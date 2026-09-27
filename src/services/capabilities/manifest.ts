import { z } from 'zod';

import type { ProviderId } from '@/domain/providers';

import { bytesToHex, hexToBytes, signEd25519, verifyEd25519 } from './ed25519';

export const CAPABILITY_AUDIENCE = 'app.devgauge.mobile';
export const CAPABILITY_ENVIRONMENTS = [
  'development',
  'preview',
  'production',
] as const;
export type CapabilityEnvironment = (typeof CAPABILITY_ENVIRONMENTS)[number];

export const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

const providerEntrySchema = z.object({
  enabled: z.boolean(),
  minimumAppVersion: z.string().optional(),
  schema: z.number().int().optional(),
});

const manifestPayloadSchema = z.object({
  version: z.number().int().positive(),
  environment: z.enum(CAPABILITY_ENVIRONMENTS),
  audience: z.string().min(1),
  issuedAt: z.string(),
  expiresAt: z.string(),
  providers: z.record(z.string(), providerEntrySchema),
});

export const signedManifestSchema = manifestPayloadSchema.extend({
  signature: z.string().regex(/^[0-9a-f]+$/i),
});

export type CapabilityManifest = z.infer<typeof manifestPayloadSchema>;
export type SignedCapabilityManifest = z.infer<typeof signedManifestSchema>;

export type CapabilityErrorReason =
  | 'malformed'
  | 'invalid-signature'
  | 'wrong-audience'
  | 'wrong-environment'
  | 'not-yet-valid'
  | 'expired'
  | 'replayed-version';

export class CapabilityError extends Error {
  readonly reason: CapabilityErrorReason;

  constructor(reason: CapabilityErrorReason, message: string) {
    super(message);
    this.name = 'CapabilityError';
    this.reason = reason;
  }
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => [
          key,
          sortValue((value as Record<string, unknown>)[key]),
        ]),
    );
  }
  return value;
}

/** Stable JSON so a signature does not depend on key order. */
export function canonicalize(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

export function manifestSigningPayload(
  manifest: CapabilityManifest,
): Uint8Array {
  return new TextEncoder().encode(canonicalize(manifest));
}

/** Test/tooling helper: signs a manifest with a hex secret key. */
export function signCapabilityManifest(
  manifest: CapabilityManifest,
  secretKeyHex: string,
): SignedCapabilityManifest {
  const signature = signEd25519(
    manifestSigningPayload(manifest),
    hexToBytes(secretKeyHex),
  );
  return { ...manifest, signature: bytesToHex(signature) };
}

export type VerifyOptions = {
  publicKeyHex: string;
  environment: CapabilityEnvironment;
  audience?: string;
  now: Date;
  /** Highest version already accepted; equal or lower is a replay. */
  lastAcceptedVersion: number;
  maxSkewMs?: number;
};

/**
 * Verifies signature, audience, environment, issue/expiry window (with bounded
 * clock skew), and monotonic version. Fails closed with a typed reason.
 */
export function verifyCapabilityManifest(
  raw: unknown,
  options: VerifyOptions,
): CapabilityManifest {
  const parsed = signedManifestSchema.safeParse(raw);
  if (!parsed.success) {
    throw new CapabilityError('malformed', 'manifest failed validation');
  }
  const { signature, ...manifest } = parsed.data;

  if (
    !verifyEd25519(
      manifestSigningPayload(manifest),
      hexToBytes(signature),
      hexToBytes(options.publicKeyHex),
    )
  ) {
    throw new CapabilityError(
      'invalid-signature',
      'signature verification failed',
    );
  }

  if (manifest.audience !== (options.audience ?? CAPABILITY_AUDIENCE)) {
    throw new CapabilityError('wrong-audience', 'audience mismatch');
  }
  if (manifest.environment !== options.environment) {
    throw new CapabilityError('wrong-environment', 'environment mismatch');
  }

  const issued = Date.parse(manifest.issuedAt);
  const expires = Date.parse(manifest.expiresAt);
  if (!Number.isFinite(issued) || !Number.isFinite(expires)) {
    throw new CapabilityError('malformed', 'invalid issuedAt/expiresAt');
  }
  const skew = options.maxSkewMs ?? MAX_CLOCK_SKEW_MS;
  if (options.now.getTime() + skew < issued) {
    throw new CapabilityError('not-yet-valid', 'manifest issued in the future');
  }
  if (options.now.getTime() - skew > expires) {
    throw new CapabilityError('expired', 'manifest has expired');
  }
  if (manifest.version <= options.lastAcceptedVersion) {
    throw new CapabilityError(
      'replayed-version',
      'manifest version is not newer',
    );
  }

  return manifest;
}

/** Numeric compare of dotted versions; missing segments count as zero. */
export function compareVersions(a: string, b: string): number {
  const left = a.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const right = b.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference < 0 ? -1 : 1;
  }
  return 0;
}

export function isProviderEnabled(
  manifest: CapabilityManifest,
  providerId: ProviderId,
  appVersion: string,
  now: Date,
): boolean {
  if (now.getTime() > Date.parse(manifest.expiresAt)) return false;
  const entry = manifest.providers[providerId];
  if (!entry || !entry.enabled) return false;
  if (
    entry.minimumAppVersion !== undefined &&
    compareVersions(appVersion, entry.minimumAppVersion) < 0
  ) {
    return false;
  }
  return true;
}

export type CapabilityGate = {
  isLiveAllowed(providerId: ProviderId): boolean;
};

export function createCapabilityGate(options: {
  manifest: CapabilityManifest | null;
  appVersion: string;
  now?: () => Date;
}): CapabilityGate {
  const now = options.now ?? (() => new Date());
  return {
    isLiveAllowed(providerId) {
      if (!options.manifest) return false;
      return isProviderEnabled(
        options.manifest,
        providerId,
        options.appVersion,
        now(),
      );
    },
  };
}
