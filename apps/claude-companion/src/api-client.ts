import type { MinimizedSnapshot } from "@devgauge/provider-claude-code";

import { DEFAULT_API_ORIGIN } from "./config.js";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface PairResult {
  deviceId: string;
  deviceSecret: string;
  accountEmail: string | null;
  alias: string | null;
}

export interface IngestResult {
  accepted: boolean;
  serverTime?: string | undefined;
  error?: string | undefined;
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
}

export class ApiClient {
  constructor(
    readonly origin: string = DEFAULT_API_ORIGIN,
    private readonly fetchImpl: FetchLike = fetch
  ) {}

  /** Exchanges a single-use pairing code for a revocable device credential. */
  async pair(code: string): Promise<PairResult> {
    const res = await this.fetchImpl(`${this.origin}/v1/companion/pair`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } } & Partial<PairResult>;
    if (!res.ok || !body.deviceId || !body.deviceSecret) {
      throw new ApiClientError(res.status, body.error?.code ?? "pair_failed", body.error?.message ?? "Pairing failed");
    }
    return body as PairResult;
  }

  /** Sends a minimized snapshot with the device credential. */
  async ingest(deviceCredential: { deviceId: string; deviceSecret: string }, snapshot: MinimizedSnapshot): Promise<IngestResult> {
    const res = await this.fetchImpl(`${this.origin}/v1/companion/snapshots`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-device-id": deviceCredential.deviceId,
        authorization: `Bearer ${deviceCredential.deviceSecret}`,
      },
      body: JSON.stringify(snapshot),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
    if (!res.ok) {
      throw new ApiClientError(res.status, body.error?.code ?? "ingest_failed", body.error?.message ?? "Sync failed");
    }
    return { accepted: true };
  }
}

export { fetch };