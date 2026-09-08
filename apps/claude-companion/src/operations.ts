import {
  minimizeStatusLine,
  type MinimizedSnapshot,
} from "@devgauge/provider-claude-code";

import { ApiClient, type FetchLike } from "./api-client.js";
import { COMPANION_VERSION, stateFilePath } from "./config.js";
import {
  createCredential,
  deleteCredential,
  isFileCredentialsAllowed,
  loadCredential,
  saveCredential,
  type DeviceCredential,
} from "./credential-store.js";
import { SnapshotQueue } from "./queue.js";
import { loadState, saveState } from "./state.js";

export interface CompanionOps {
  apiClient: ApiClient;
}

export class IngestResult {
  constructor(readonly status: "queued" | "coalesced" | "sent" | "failed") {}
}

/** Reads exactly one bounded JSON document from stdin and minimizes it. */
export const parseAndMinimizeStdin = async (deviceId: string): Promise<MinimizedSnapshot> => {
  let raw = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) {
    raw += chunk;
    if (Buffer.byteLength(raw, "utf8") > 512 * 1024) {
      throw new Error("input exceeds size limit");
    }
  }
  const parsed = JSON.parse(raw) as unknown;
  return minimizeStatusLine(parsed, { deviceId, capturedAt: new Date().toISOString(), localSequence: Date.now() });
};

export interface PairCommandInput {
  code: string;
  apiClient: ApiClient;
}

export const pair = async (input: PairCommandInput): Promise<DeviceCredential> => {
  const result = await input.apiClient.pair(input.code);
  const credential = createCredential({
    deviceId: result.deviceId,
    deviceSecret: result.deviceSecret,
    accountEmail: result.accountEmail,
  });
  await saveCredential(credential);
  const state = await loadState();
  state.deviceId = result.deviceId;
  state.deviceAlias = result.alias;
  state.accountEmail = result.accountEmail;
  await saveState(state);
  return credential;
};

export const ingestOne = async (ops: { deviceId: string }): Promise<MinimizedSnapshot> =>
  parseAndMinimizeStdin(ops.deviceId);

export interface IngestCommandInput {
  stdinReader?: () => Promise<string>;
  device: DeviceCredential;
  apiClient: ApiClient;
}

/** Reads stdin, minimizes it, queues it, then best-effort flushes the queue. */
export const ingest = async (input: IngestCommandInput): Promise<string> => {
  const raw = await (input.stdinReader ? input.stdinReader() : readStdin());
  const parsed = JSON.parse(raw) as unknown;
  const snapshot = minimizeStatusLine(parsed, {
    deviceId: input.device.deviceId,
    capturedAt: new Date().toISOString(),
    localSequence: Date.now(),
  });

  const localKey = Buffer.from(input.device.localKeyBase64, "base64");
  const queue = await SnapshotQueue.load(localKey);
  const outcome = queue.enqueue(snapshot);
  await queue.persist();

  const state = await loadState();
  state.lastCaptureAt = snapshot.capturedAt;
  await saveState(state);

  // Best-effort flush; never blocks Claude Code on network failure.
  try {
    const sent = await flushQueue(input.apiClient, input.device, localKey);
    if (sent > 0) return `sent ${sent}`;
  } catch {
    // offline — remain queued
  }
  return outcome;
};

/** Attempts to sync the whole queue; returns count sent. */
export const flushQueue = async (
  apiClient: ApiClient,
  device: DeviceCredential,
  localKey: Buffer
): Promise<number> => {
  const queue = await SnapshotQueue.load(localKey);
  const entries = [...queue.all];
  let sent = 0;
  for (const entry of entries) {
    await apiClient.ingest(device, entry.snapshot);
    queue.acknowledgeThrough(entry.localSequence);
    sent++;
  }
  if (sent > 0) {
    await queue.persist();
    const state = await loadState();
    state.lastSyncAt = new Date().toISOString();
    await saveState(state);
  }
  return sent;
};

export const readStdin = async (): Promise<string> => {
  let raw = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) {
    raw += chunk;
    if (Buffer.byteLength(raw, "utf8") > 512 * 1024) throw new Error("input exceeds size limit");
  }
  return raw;
};

export interface DoctorReport {
  ok: boolean;
  credential: boolean;
  fileCredentialsAllowed: boolean;
  apiReachable: boolean;
  queueCount: number;
  version: string;
}

export const doctor = async (opts: { apiClient: ApiClient }): Promise<DoctorReport> => {
  const credential = await loadCredential();
  let apiReachable = false;
  if (credential) {
    try {
      await opts.apiClient.ingest(credential, {
        schemaVersion: 1,
        deviceId: credential.deviceId,
        capturedAt: new Date().toISOString(),
        localSequence: 0,
      } satisfies MinimizedSnapshot);
      apiReachable = true;
    } catch {
      apiReachable = false;
    }
  }
  let queueCount = 0;
  if (credential) {
    const q = await SnapshotQueue.load(Buffer.from(credential.localKeyBase64, "base64"));
    queueCount = q.size;
  }
  return {
    ok: Boolean(credential) && apiReachable,
    credential: Boolean(credential),
    fileCredentialsAllowed: isFileCredentialsAllowed(),
    apiReachable,
    queueCount,
    version: COMPANION_VERSION,
  };
};

export const uninstall = async (): Promise<void> => {
  await deleteCredential();
  const { rm } = await import("node:fs/promises");
  await rm(stateFilePath(), { force: true });
};

export type { FetchLike };