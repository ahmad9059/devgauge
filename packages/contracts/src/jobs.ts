export const CODEX_JOB_NAMES = {
  login: "codex-login",
  refresh: "codex-refresh",
  resetCredit: "codex-reset-credit",
  disconnect: "codex-disconnect",
} as const;

export interface ProviderJobData {
  userId: string;
  connectionId: string;
  requestId: string;
  idempotencyKey: string;
  attemptId?: string;
  provider?: string;
  attempt?: number;
}
