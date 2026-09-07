import { ExitCode, type CommandResult } from "./exit.js";

const stub = (command: string, detail: string): CommandResult => ({
  code: ExitCode.Success,
  message: `devgauge-companion ${command}: Phase 2 skeleton — ${detail} (implemented in Phase 8)`,
  data: { command, phase: 2, implementedInPhase: 8 },
});

export interface PairOptions {
  code?: string;
}

export const pairCommand = (options: PairOptions): CommandResult =>
  stub("pair", options.code ? `would exchange pairing code (len ${options.code.length})` : "missing --code is a usage error");

export const ingestCommand = (): CommandResult =>
  stub("ingest", "would read one bounded JSON document from stdin and minimize it");

export const installCommand = (): CommandResult =>
  stub("install", "would preview and merge the Claude statusLine command with an atomic backup");

export const uninstallCommand = (): CommandResult =>
  stub("uninstall", "would remove only DevGauge-owned configuration");

export const statusCommand = (): CommandResult =>
  stub("status", "would report pairing, last capture/sync, queue, version, and update availability");

export const doctorCommand = (): CommandResult =>
  stub("doctor", "would check config syntax, permissions, clock skew, TLS reachability, and queue health");