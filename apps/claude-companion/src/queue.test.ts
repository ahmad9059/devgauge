import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SnapshotQueue, MAX_QUEUE_ENTRIES } from "./queue.js";
import { decryptBlob, encryptBlob } from "./crypto.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "devgauge-q-"));
  process.env.DEVGAUGE_COMPANION_DIR = dir;
});
afterEach(() => {
  delete process.env.DEVGAUGE_COMPANION_DIR;
});

const key = Buffer.alloc(32, 7);
const snap = (seq: number, percent: number): Parameters<SnapshotQueue["enqueue"]>[0] => ({
  schemaVersion: 1,
  deviceId: "dev_1",
  capturedAt: new Date(Date.now() - 1000 + seq).toISOString(),
  localSequence: seq,
  rateLimits: { five_hour: { used_percentage: percent, resets_at: 1_788_600_000 } },
});

describe("SnapshotQueue", () => {
  it("coalesces an unchanged snapshot into the head", async () => {
    const queue = await SnapshotQueue.load(key);
    expect(queue.enqueue(snap(1, 23))).toBe("queued");
    expect(queue.enqueue(snap(2, 23))).toBe("coalesced");
    expect(queue.size).toBe(1);
    await queue.persist();
    const reloaded = await SnapshotQueue.load(key);
    expect(reloaded.size).toBe(1);
    expect(reloaded.head?.snapshot.localSequence).toBe(2);
  });

  it("keeps changed snapshots in order", async () => {
    const queue = await SnapshotQueue.load(key);
    queue.enqueue(snap(1, 23));
    queue.enqueue(snap(2, 25));
    expect(queue.size).toBe(2);
    expect(queue.head?.snapshot.localSequence).toBe(2);
  });

  it("caps the queue size", async () => {
    const queue = new SnapshotQueue(key);
    for (let i = 1; i <= MAX_QUEUE_ENTRIES + 20; i++) queue.enqueue(snap(i, i % 100));
    expect(queue.size).toBe(MAX_QUEUE_ENTRIES);
  });

  it("acknowledges through a sequence (idempotent sync)", async () => {
    const queue = new SnapshotQueue(key);
    queue.enqueue(snap(1, 10));
    queue.enqueue(snap(2, 20));
    queue.acknowledgeThrough(1);
    expect(queue.size).toBe(1);
    expect(queue.head?.snapshot.localSequence).toBe(2);
    // A duplicate ack is a no-op, not an error.
    queue.acknowledgeThrough(1);
    expect(queue.size).toBe(1);
  });

  it("round-trips through encrypted persistence", async () => {
    const queue = await SnapshotQueue.load(key);
    queue.enqueue(snap(1, 10));
    queue.enqueue(snap(2, 20));
    await queue.persist();
    const reloaded = await SnapshotQueue.load(key);
    expect(reloaded.size).toBe(2);
    expect(reloaded.head?.snapshot.rateLimits?.five_hour?.used_percentage).toBe(20);
  });
});

describe("encryptBlob/decryptBlob", () => {
  it("encrypts at rest and refuses wrong keys", () => {
    const blob = encryptBlob(key, "hello");
    expect(blob.toString("base64")).not.toContain("hello");
    const other = Buffer.alloc(32, 9);
    expect(() => decryptBlob(other, blob)).toThrow();
  });
});