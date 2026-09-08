import type { Redis } from "ioredis";
import { describe, expect, it } from "vitest";

import { withConnectionLock } from "./locks.js";

class FakeRedis {
  private values = new Map<string, string>();

  async set(key: string, value: string): Promise<"OK" | null> {
    if (this.values.has(key)) return null;
    this.values.set(key, value);
    return "OK";
  }

  async eval(script: string, _keys: number, key: string, token: string): Promise<number> {
    if (this.values.get(key) !== token) return 0;
    if (script.includes("del")) this.values.delete(key);
    return 1;
  }
}

describe("Codex connection lock", () => {
  it("serializes jobs for one profile without blocking another profile", async () => {
    const redis = new FakeRedis() as unknown as Redis;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const first = withConnectionLock(redis, "connection-a", 30_000, async () => gate);
    await Promise.resolve();

    await expect(withConnectionLock(redis, "connection-a", 30_000, async () => undefined)).rejects.toThrow(/busy/);
    await expect(withConnectionLock(redis, "connection-b", 30_000, async () => "ok")).resolves.toBe("ok");
    release();
    await first;
  });
});
