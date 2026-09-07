/** Structured process exit codes for the companion CLI. */
export const ExitCode = {
  Success: 0,
  RuntimeError: 1,
  UsageError: 2,
} as const;

export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode];

export interface CommandResult {
  code: ExitCodeValue;
  message: string;
  /** Optional structured payload for --json callers. */
  data?: Record<string, unknown>;
}