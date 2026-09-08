import { mkdir, readFile, rename, writeFile } from "node:fs/promises";

import type { MinimizedSnapshot } from "@devgauge/provider-claude-code";

import { configDir, queueFilePath } from "./config.js";
import { decryptBlob, encryptBlob } from "./crypto.js";

export const MAX_QUEUE_ENTRIES = 500;
export const MAX_QUEUE_AGE_MS = 7 * 24 * 3_600_000; // 7 days

export interface QueueEntry {
  localSequence: number;
  capturedAt: string;
  snapshot: MinimizedSnapshot;
}

export class QueueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QueueError";
  }
}

/**
 * Encrypted, bounded, append-only snapshot queue.
 * - Encrypted at rest with the local key (in the credential store).
 * - Coalesces an entry identical to the newest queued snapshot (same windows).
 * - Caps size and age; oldest are dropped only when the cap is exceeded.
 */
export class SnapshotQueue {
  private entries: QueueEntry[] = [];

  constructor(private readonly key: Buffer) {}

  static async load(key: Buffer): Promise<SnapshotQueue> {
    const queue = new SnapshotQueue(key);
    try {
      const raw = await readFile(queueFilePath(), "utf8");
      const decrypted = decryptBlob(key, Buffer.from(raw, "base64"));
      queue.entries = JSON.parse(decrypted) as QueueEntry[];
      // Drop anything malformed rather than failing the queue.
      if (!Array.isArray(queue.entries)) queue.entries = [];
    } catch {
      queue.entries = [];
    }
    return queue;
  }

  get size(): number {
    return this.entries.length;
  }

  get head(): QueueEntry | null {
    return this.entries.length > 0 ? this.entries[this.entries.length - 1]! : null;
  }

  get all(): readonly QueueEntry[] {
    return this.entries;
  }

  /** True when the snapshot is byte-identical to the newest queued snapshot's rate windows. */
  isDuplicateOfHead(snapshot: MinimizedSnapshot): boolean {
    const head = this.head;
    if (!head) return false;
    return JSON.stringify(head.snapshot.rateLimits) === JSON.stringify(snapshot.rateLimits);
  }

  enqueue(snapshot: MinimizedSnapshot): "queued" | "coalesced" {
    // Coalesce unchanged windows: keep the newest capture, drop the older head.
    if (this.isDuplicateOfHead(snapshot)) {
      this.entries[this.entries.length - 1] = { localSequence: snapshot.localSequence, capturedAt: snapshot.capturedAt, snapshot };
      return "coalesced";
    }
    this.entries.push({ localSequence: snapshot.localSequence, capturedAt: snapshot.capturedAt, snapshot });
    this.prune();
    return "queued";
  }

  /** Removes entries from the front once past the size cap or age cap. */
  prune(now = Date.now()): void {
    while (this.entries.length > MAX_QUEUE_ENTRIES) this.entries.shift();
    const cutoff = now - MAX_QUEUE_AGE_MS;
    while (this.entries.length > 0 && new Date(this.entries[0]!.capturedAt).getTime() < cutoff) {
      this.entries.shift();
    }
  }

  /** Remove successfully synced entries up to (and including) a sequence. */
  acknowledgeThrough(localSequence: number): void {
    const idx = this.entries.findIndex((e) => e.localSequence === localSequence);
    if (idx >= 0) this.entries.splice(0, idx + 1);
  }

  async persist(): Promise<void> {
    await mkdir(configDir(), { recursive: true, mode: 0o700 });
    const encrypted = encryptBlob(this.key, JSON.stringify(this.entries)).toString("base64");
    const tmp = `${queueFilePath()}.tmp`;
    await writeFile(tmp, encrypted, { mode: 0o600 });
    await rename(tmp, queueFilePath());
  }
}