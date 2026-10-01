import type { UsageWindow } from '@/domain/usage';
import type { SessionProviderId } from './session-config';

/** Valid quota data can commit even when the provider omits reset timing. */
export function isQuotaReady(
  providerId: SessionProviderId,
  windows: readonly UsageWindow[],
): boolean {
  if (!windows.length) return false;
  const required =
    providerId === 'claude' || providerId === 'codex'
      ? ['rolling', 'weekly']
      : providerId === 'command-code'
        ? ['rolling', 'weekly', 'monthly']
        : [];
  return required.every((kind) =>
    windows.some(
      (window) => window.kind === kind && window.utilization !== null,
    ),
  );
}
