// Static provider fixtures for Phase 3 visual work. No network, no auth.
// Times are relative offsets so cards render deterministically in tests.

import type { ProviderId } from '@/domain/providers';

export type { ProviderId };

export type SupportTier = 'supported' | 'experimental' | 'blocked';

export type ProviderState =
  | 'connected'
  | 'disconnected'
  | 'candidate-disabled'
  | 'experimental'
  | 'blocked'
  | 'stale'
  | 'rate-limited'
  | 'auth-expired'
  | 'error';

export type UsageUnit =
  'percent' | 'requests' | 'credits' | 'tokens' | 'currency';

export type UsageWindowKind =
  'rolling' | 'daily' | 'weekly' | 'monthly' | 'billing-period';

export type UsageWindow = {
  kind: UsageWindowKind;
  label: string;
  unit: UsageUnit;
  used?: number;
  limit?: number;
  remaining?: number;
  percent?: number;
  resetsInMinutes?: number;
  /** Raw reset text when the source does not give a parseable timestamp. */
  resetsText?: string;
};

export type ProviderFixture = {
  id: ProviderId;
  displayName: string;
  /** Neutral monogram until official brand assets are approved. */
  monogram: string;
  planName?: string;
  tier: SupportTier;
  state: ProviderState;
  source: 'live' | 'manual' | 'none';
  updatedMinutesAgo?: number;
  windows: UsageWindow[];
  note?: string;
  /** First-party page the user can open instead of a fake login control. */
  dashboardUrl?: string;
};

export const providerFixtures: ProviderFixture[] = [
  {
    id: 'claude',
    displayName: 'Claude',
    monogram: 'CL',
    planName: 'Max',
    tier: 'supported',
    state: 'connected',
    source: 'live',
    updatedMinutesAgo: 3,
    windows: [
      {
        kind: 'rolling',
        label: '5-hour window',
        unit: 'percent',
        used: 42,
        limit: 100,
        remaining: 58,
        percent: 42,
        resetsInMinutes: 96,
      },
      {
        kind: 'weekly',
        label: 'Weekly',
        unit: 'percent',
        used: 71,
        limit: 100,
        remaining: 29,
        percent: 71,
        resetsInMinutes: 4320,
      },
    ],
    note: 'Sessions verified on Android in Phase 1.',
  },
  {
    id: 'codex',
    displayName: 'Codex',
    monogram: 'CX',
    planName: 'Plus',
    tier: 'supported',
    state: 'auth-expired',
    source: 'manual',
    updatedMinutesAgo: 2880,
    windows: [
      {
        kind: 'rolling',
        label: '5-hour window',
        unit: 'percent',
        used: 88,
        limit: 100,
        remaining: 12,
        percent: 88,
        resetsInMinutes: 42,
      },
    ],
    note: 'Sign in again to resume live refresh.',
  },
  {
    id: 'github-copilot',
    displayName: 'GitHub Copilot',
    monogram: 'GH',
    planName: 'Individual',
    tier: 'supported',
    state: 'stale',
    source: 'live',
    updatedMinutesAgo: 190,
    windows: [
      {
        kind: 'monthly',
        label: 'Monthly requests',
        unit: 'requests',
        used: 640,
        limit: 1500,
        remaining: 860,
        percent: 43,
        resetsInMinutes: 20160,
      },
    ],
    note: 'Showing the last stored snapshot.',
  },
  {
    id: 'command-code',
    displayName: 'Command Code',
    monogram: 'CC',
    tier: 'experimental',
    state: 'experimental',
    source: 'none',
    windows: [
      {
        kind: 'rolling',
        label: '5-hour window',
        unit: 'credits',
        used: 12,
        limit: 50,
        remaining: 38,
        percent: 24,
        resetsInMinutes: 210,
      },
      {
        kind: 'weekly',
        label: 'Weekly credits',
        unit: 'credits',
        used: 74,
        limit: 200,
        remaining: 126,
        percent: 37,
        resetsInMinutes: 6200,
      },
    ],
    note: 'Disabled until the vendor confirms the usage contract.',
  },
  {
    id: 'opencode-go',
    displayName: 'OpenCode Go',
    monogram: 'OG',
    tier: 'experimental',
    state: 'rate-limited',
    source: 'live',
    updatedMinutesAgo: 12,
    windows: [
      {
        kind: 'billing-period',
        label: 'Billing period',
        unit: 'currency',
        used: 18.5,
        limit: 40,
        remaining: 21.5,
        percent: 46,
        resetsInMinutes: 14400,
      },
    ],
    note: 'Refresh is paused after a rate-limit response.',
  },
  {
    id: 'gemini-cli',
    displayName: 'Antigravity CLI',
    monogram: 'GM',
    tier: 'blocked',
    state: 'blocked',
    source: 'none',
    windows: [],
    note: 'Account-wide quota access not yet confirmed for Android.',
    dashboardUrl: 'https://geminicli.com/docs/resources/quota-and-pricing/',
  },
];

/** One fixture per UI state, used to prove every state renders. */ export const stateShowcase: ProviderFixture[] =
  [
    {
      id: 'claude',
      displayName: 'Claude',
      monogram: 'CL',
      planName: 'Pro',
      tier: 'supported',
      state: 'connected',
      source: 'live',
      updatedMinutesAgo: 1,
      windows: [
        {
          kind: 'rolling',
          label: '5-hour window',
          unit: 'percent',
          used: 10,
          limit: 100,
          remaining: 90,
          percent: 10,
          resetsInMinutes: 280,
        },
      ],
    },
    {
      id: 'codex',
      displayName: 'Codex',
      monogram: 'CX',
      tier: 'supported',
      state: 'disconnected',
      source: 'none',
      windows: [],
    },
    {
      id: 'command-code',
      displayName: 'Command Code',
      monogram: 'CC',
      tier: 'experimental',
      state: 'candidate-disabled',
      source: 'none',
      windows: [],
    },
    {
      id: 'opencode-go',
      displayName: 'OpenCode Go',
      monogram: 'OG',
      tier: 'experimental',
      state: 'experimental',
      source: 'manual',
      updatedMinutesAgo: 60,
      windows: [
        {
          kind: 'weekly',
          label: 'Weekly credits',
          unit: 'credits',
          used: 30,
          limit: 100,
          remaining: 70,
          percent: 30,
          resetsInMinutes: 5000,
        },
      ],
    },
    {
      id: 'gemini-cli',
      displayName: 'Antigravity CLI',
      monogram: 'GM',
      tier: 'blocked',
      state: 'blocked',
      source: 'none',
      windows: [],
    },
    {
      id: 'github-copilot',
      displayName: 'GitHub Copilot',
      monogram: 'GH',
      tier: 'supported',
      state: 'stale',
      source: 'live',
      updatedMinutesAgo: 400,
      windows: [
        {
          kind: 'monthly',
          label: 'Monthly requests',
          unit: 'requests',
          used: 900,
          limit: 1500,
          remaining: 600,
          percent: 60,
          resetsInMinutes: 12000,
        },
      ],
    },
    {
      id: 'opencode-go',
      displayName: 'OpenCode Go',
      monogram: 'OG',
      tier: 'experimental',
      state: 'rate-limited',
      source: 'live',
      updatedMinutesAgo: 5,
      windows: [
        {
          kind: 'billing-period',
          label: 'Billing period',
          unit: 'currency',
          used: 9,
          limit: 40,
          remaining: 31,
          percent: 22.5,
          resetsInMinutes: 9000,
        },
      ],
    },
    {
      id: 'codex',
      displayName: 'Codex',
      monogram: 'CX',
      tier: 'supported',
      state: 'auth-expired',
      source: 'manual',
      updatedMinutesAgo: 1500,
      windows: [
        {
          kind: 'rolling',
          label: '5-hour window',
          unit: 'percent',
          used: 55,
          limit: 100,
          remaining: 45,
          percent: 55,
          resetsInMinutes: 120,
        },
      ],
    },
    {
      id: 'claude',
      displayName: 'Claude',
      monogram: 'CL',
      tier: 'supported',
      state: 'error',
      source: 'none',
      windows: [],
      note: 'The last refresh failed. Retry when online.',
    },
  ];

export type ConnectorMetadata = {
  authMethod: string;
  dataSummary: string;
  retention: string;
};

/**
 * Plain-language connection facts shown before any CTA. These describe the
 * intended Phase 6/8 flows and make no claim that a connector is enabled.
 */
export const connectorMetadata: Record<ProviderId, ConnectorMetadata> = {
  claude: {
    authMethod: 'In-app session',
    dataSummary: 'Five-hour and weekly usage',
    retention: 'On this device',
  },
  codex: {
    authMethod: 'In-app session',
    dataSummary: 'Five-hour and weekly usage',
    retention: 'On this device',
  },
  'github-copilot': {
    authMethod: 'In-app session',
    dataSummary: 'Monthly request allowance',
    retention: 'On this device',
  },
  'command-code': {
    authMethod: 'In-app session',
    dataSummary: 'Five-hour and weekly usage',
    retention: 'On this device',
  },
  'opencode-go': {
    authMethod: 'In-app session',
    dataSummary: 'Five-hour and weekly usage',
    retention: 'On this device',
  },
  'gemini-cli': {
    authMethod: 'In-app session',
    dataSummary: 'Hourly and weekly usage',
    retention: 'On this device',
  },
};

export function findProviderFixture(
  id: string | undefined,
): ProviderFixture | undefined {
  if (!id) return undefined;
  return providerFixtures.find((provider) => provider.id === id);
}
