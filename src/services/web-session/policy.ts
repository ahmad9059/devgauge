import type { ProviderId } from '@/domain/providers';

export type WebSessionGate = {
  providerId: ProviderId;
  loginValidated: boolean;
  sessionPersistenceValidated: boolean;
  usageAccessValidated: boolean;
  policyReviewed: boolean;
};

/**
 * Phase 1 evidence, per provider. All gates are false because no signed-in
 * Android website-session test has passed; a web-session adapter is created for
 * a provider only when every flag is true. This is an app-level decision, not a
 * remote flag.
 */
export const WEB_SESSION_GATES: Record<
  'claude' | 'codex' | 'github-copilot',
  WebSessionGate
> = {
  claude: {
    providerId: 'claude',
    loginValidated: false,
    sessionPersistenceValidated: false,
    usageAccessValidated: false,
    policyReviewed: false,
  },
  codex: {
    providerId: 'codex',
    loginValidated: false,
    sessionPersistenceValidated: false,
    usageAccessValidated: false,
    policyReviewed: false,
  },
  'github-copilot': {
    providerId: 'github-copilot',
    loginValidated: false,
    sessionPersistenceValidated: false,
    usageAccessValidated: false,
    policyReviewed: false,
  },
};

export function isWebSessionEnabled(gate: WebSessionGate): boolean {
  return (
    gate.loginValidated &&
    gate.sessionPersistenceValidated &&
    gate.usageAccessValidated &&
    gate.policyReviewed
  );
}

export function webSessionEnabled(
  providerId: 'claude' | 'codex' | 'github-copilot',
): boolean {
  return isWebSessionEnabled(WEB_SESSION_GATES[providerId]);
}
