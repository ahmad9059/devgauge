export type ExperimentalProviderId = 'command-code' | 'opencode-go';

export type ExperimentalDisclosure = {
  providerId: ExperimentalProviderId;
  name: string;
  supportTier: 'experimental';
  summary: string;
  points: string[];
  broadKeyWarning: string;
  revocation: { instructions: string; url: string };
  killSwitchNote: string;
};

const VENDORS: Record<
  ExperimentalProviderId,
  { name: string; keyUrl: string }
> = {
  'command-code': {
    name: 'Command Code',
    keyUrl: 'https://commandcode.ai/docs/resources/pricing-limits',
  },
  'opencode-go': {
    name: 'OpenCode Go',
    keyUrl: 'https://opencode.ai/docs/go/',
  },
};

/**
 * Plain-language disclosure shown before an experimental API-key connector can
 * be enabled. It states that live access stays off until a verified vendor
 * contract exists, warns about broad keys, and explains revocation.
 */
export function experimentalDisclosure(
  providerId: ExperimentalProviderId,
): ExperimentalDisclosure {
  const vendor = VENDORS[providerId];
  return {
    providerId,
    name: vendor.name,
    supportTier: 'experimental',
    summary: `${vendor.name} stays disabled until the vendor issues a documented, read-only usage contract.`,
    points: [
      'No official third-party usage contract is confirmed, so DevGauge makes no network request.',
      'A connector is only enabled after the vendor-owned endpoint, scope, schema, polling limit, and revocation are recorded and verified.',
      'Cached data stays readable while the connector is disabled.',
      'Use a dedicated key for DevGauge; never reuse a key that can spend or change account settings.',
    ],
    broadKeyWarning:
      'This vendor API key may authorize model usage or spending, not only read usage. If a read-only key cannot be issued, keep the connector disabled.',
    revocation: {
      instructions: `Remove the key in ${vendor.name}'s API key settings to revoke access, then disconnect in DevGauge to delete the local secret.`,
      url: vendor.keyUrl,
    },
    killSwitchNote:
      'A signed capability manifest can disable this connector remotely; disabling stops requests but never blocks local deletion or read-only cache.',
  };
}
