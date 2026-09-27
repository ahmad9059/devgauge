// Canonical closed provider registry for the v1 scope. Support tier is owned by
// the registry, never persisted in storage rows.

export const PROVIDER_IDS = [
  'claude',
  'codex',
  'command-code',
  'opencode-go',
  'github-copilot',
  'gemini-cli',
] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

export function isProviderId(value: unknown): value is ProviderId {
  return (
    typeof value === 'string' &&
    (PROVIDER_IDS as readonly string[]).includes(value)
  );
}
