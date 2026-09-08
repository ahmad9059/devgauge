import { ApiClient } from "./api-client.js";
import { COMPANION_VERSION } from "./config.js";
import { loadCredential, saveCredential } from "./credential-store.js";
import { SnapshotQueue } from "./queue.js";
import { loadState, saveState } from "./state.js";
import { doctor, flushQueue, ingest, pair, uninstall } from "./operations.js";
import { ExitCode, type CommandResult, type ExitCodeValue } from "./exit.js";

const ok = (message: string, data?: Record<string, unknown>): CommandResult => ({
  code: ExitCode.Success,
  message,
  ...(data ? { data } : {}),
});
const fail = (message: string, code: ExitCodeValue = ExitCode.RuntimeError, data?: Record<string, unknown>): CommandResult => ({
  code,
  message,
  ...(data ? { data } : {}),
});

export interface PairOptions {
  code?: string;
  apiClient?: ApiClient;
}

export const pairCommand = async (options: PairOptions): Promise<CommandResult> => {
  if (!options.code) {
    return fail("pair requires --code <code>", ExitCode.UsageError);
  }
  const client = options.apiClient ?? new ApiClient();
  try {
    const credential = await pair({ code: options.code, apiClient: client });
    return ok(`Paired as device ${credential.deviceId}.`, {
      deviceId: credential.deviceId,
      accountEmail: credential.accountEmail,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Pairing failed");
  }
};

export const ingestCommand = async (): Promise<CommandResult> => {
  const credential = await loadCredential();
  if (!credential) return fail("Not paired. Run `devgauge-companion pair --code <code>` first.");
  const client = new ApiClient();
  try {
    const outcome = await ingest({ device: credential, apiClient: client });
    return ok(outcome);
  } catch (error) {
    // Never let an ingest failure block Claude Code; report quietly.
    const message = error instanceof Error ? error.message : "Ingest failed";
    return ok(`queued offline (${message})`, { offline: true });
  }
};

export const installCommand = async (): Promise<CommandResult> => {
  // MVP: instruct the user (and verify the binary is on PATH). A future
  // version may merge the statusLine config after showing a diff.
  return ok(
    "Add to your Claude Code settings (.claude/settings.json): " +
      JSON.stringify({ statusLine: { type: "command", command: "devgauge-companion ingest", refreshInterval: 300 } })
  );
};

export const uninstallCommand = async (): Promise<CommandResult> => {
  await uninstall();
  return ok("Removed DevGauge companion credential and local state.");
};

export const statusCommand = async (): Promise<CommandResult> => {
  const credential = await loadCredential();
  const state = await loadState();
  if (!credential) {
    return ok("Not paired.", { paired: false, version: COMPANION_VERSION });
  }
  let queueCount = 0;
  const queue = await SnapshotQueue.load(Buffer.from(credential.localKeyBase64, "base64"));
  queueCount = queue.size;
  return ok("Paired.", {
    paired: true,
    deviceId: credential.deviceId,
    accountEmail: credential.accountEmail,
    queueCount,
    lastCaptureAt: state.lastCaptureAt,
    lastSyncAt: state.lastSyncAt,
    version: COMPANION_VERSION,
  });
};

export const doctorCommand = async (): Promise<CommandResult> => {
  const report = await doctor({ apiClient: new ApiClient() });
  return report.ok
    ? ok("All checks passed.", report as unknown as Record<string, unknown>)
    : fail(`Issues found: ${JSON.stringify(report)}`, ExitCode.RuntimeError, report as unknown as Record<string, unknown>);
};

export const syncCommand = async (): Promise<CommandResult> => {
  const credential = await loadCredential();
  if (!credential) return fail("Not paired.");
  const client = new ApiClient();
  try {
    const sent = await flushQueue(client, credential, Buffer.from(credential.localKeyBase64, "base64"));
    const state = await loadState();
    state.lastSyncAt = new Date().toISOString();
    await saveState(state);
    return ok(sent === 0 ? "Queue empty." : `Synced ${sent} snapshot(s).`, { sent });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Sync failed");
  }
};

export { saveCredential };