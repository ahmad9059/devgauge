/**
 * Subprocess sandbox contract for provider child processes (Codex App Server,
 * Copilot SDK/CLI runtime).
 *
 * Policy (enforced at the process boundary in Phase 5-7):
 * - Unprivileged UID, no ambient repository or source mount.
 * - Read-only root filesystem; isolated, per-job temporary storage.
 * - Core dumps disabled (`ulimit -c 0`).
 * - No cloud metadata access; provider-specific outbound allowlist only.
 * - No direct API/database/Redis/KMS credentials in the child environment.
 * - Only supervisor-owned `stdio` and explicitly approved IPC.
 */

/** Environment variables a provider child process is allowed to inherit. */
export const SANDBOX_ENV_ALLOWLIST = [
  "PATH",
  "TMPDIR",
  "TZ",
  "LANG",
  "LC_ALL",
  "HOME",
  "USER",
  "NO_COLOR",
  "TERM",
  "CI",
] as const;

/** Key fragments that must never reach a provider child environment. */
export const FORBIDDEN_ENV_FRAGMENTS = [
  "DATABASE_URL",
  "REDIS_URL",
  "AWS_",
  "AZURE_",
  "GCP_",
  "GOOGLE_",
  "KMS",
  "SECRET",
  "TOKEN",
  "API_KEY",
  "PASSWORD",
  "CLIENT_SECRET",
  "CREDENTIAL",
  "PROFILE_",
  "S3_",
  "MINIO_",
] as const;

/** Returns a new environment containing only allowlisted variables. */
export const scrubEnv = (
  source: Record<string, string | undefined>,
  allowlist: readonly string[] = SANDBOX_ENV_ALLOWLIST
): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const key of allowlist) {
    const value = source[key];
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
};

export interface SandboxProbe {
  ok: boolean;
  leaked: string[];
}

/** Detects forbidden credentials/metadata keys present in an environment. */
export const probeForForbiddenEnv = (
  candidate: Record<string, string | undefined>,
  fragments: readonly string[] = FORBIDDEN_ENV_FRAGMENTS
): SandboxProbe => {
  const leaked = Object.keys(candidate)
    .map((key) => key.toUpperCase())
    .filter((key) => fragments.some((fragment) => key.includes(fragment)));
  return { ok: leaked.length === 0, leaked };
};

/**
 * Describes the enforceable sandbox policy. Used by tests and by the
 * Phase 5-7 process supervisors to self-check before launching children.
 */
export const describeSandboxPolicy = (): string =>
  [
    "unprivileged uid",
    "read-only root",
    "isolated per-job tmp",
    "core dumps disabled",
    "no cloud metadata",
    "allowlisted provider egress",
    "no db/redis/kms credentials",
    "supervisor-owned stdio only",
  ].join("; ");