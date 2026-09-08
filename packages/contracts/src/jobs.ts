export const CODEX_JOB_NAMES = {
  login: "codex-login",
  refresh: "codex-refresh",
  resetCredit: "codex-reset-credit",
  disconnect: "codex-disconnect",
  deleteAccount: "codex-account-delete",
} as const;

export const PRODUCT_JOB_NAMES = {
  evaluateAlerts: "evaluate-alerts",
  rollupRetention: "rollup-retention",
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
