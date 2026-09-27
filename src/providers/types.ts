import type { ProviderId } from '@/domain/providers';
import type {
  AccountIdentity,
  UsageSnapshot,
  UsageWindow,
} from '@/domain/usage';
import type { HttpClient } from '@/services/network/client';
import type {
  AccountScope,
  AuthMode,
  ProviderConnection,
} from '@/storage/types';

export const SUPPORT_TIERS = [
  'candidate-supported',
  'supported',
  'experimental',
  'blocked',
] as const;
export type SupportTier = (typeof SUPPORT_TIERS)[number];

export type ProviderCapabilities = {
  liveUsage: boolean;
  remoteRevocation: boolean;
  resetRedemption: boolean;
  organizationScope: boolean;
};

export type ProviderDescriptor = {
  id: ProviderId;
  displayName: string;
  /** Registry-owned; never persisted in connection rows. */
  supportTier: SupportTier;
  authModes: AuthMode[];
  capabilities: ProviderCapabilities;
  minimumRefreshIntervalSeconds: number;
  /** Hosts an adapter for this provider may contact. */
  allowlistedHosts: string[];
  /** Experimental connectors require an enabled signed capability manifest. */
  requiresCapabilityManifest: boolean;
  /** Allowlisted first-party page to open for manual flows. */
  firstPartyUsageUrl?: string;
};

export type ProviderCredential =
  | { kind: 'none' }
  | { kind: 'api-key'; apiKey: string }
  | {
      kind: 'oauth';
      accessToken: string;
      refreshToken?: string;
      expiresAt?: string;
    }
  | { kind: 'web-session' };

export type FetchUsageContext = {
  connection: ProviderConnection;
  credential: ProviderCredential;
  now: Date;
  signal: AbortSignal;
  client: HttpClient;
};

export type NormalizedUsageResult = {
  identity?: AccountIdentity;
  fetchedAt: string;
  schemaVersion: number;
  isPartial: boolean;
  windows: UsageWindow[];
  safeRequestId?: string;
};

export type ConnectInput = {
  providerId: ProviderId;
  accountScope: AccountScope;
  authMode: AuthMode;
};

export type ConnectionDraft = {
  canonicalAccountKey: string;
  identity: AccountIdentity;
  credentialRef: string | null;
};

export interface ProviderAdapter {
  readonly descriptor: ProviderDescriptor;
  /** Absent for blocked/manual providers. Must never fabricate values. */
  fetchUsage?(context: FetchUsageContext): Promise<NormalizedUsageResult>;
  /** Returns an allowlisted first-party URL, or null when none applies. */
  openFirstPartyUsage?(): Promise<string | null>;
  revoke?(credential: ProviderCredential): Promise<void>;
}

export type { UsageSnapshot, UsageWindow };
