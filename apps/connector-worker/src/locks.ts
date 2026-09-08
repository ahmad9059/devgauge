import { randomUUID } from "node:crypto";

import type { Redis } from "ioredis";

const RELEASE = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
const RENEW = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('pexpire', KEYS[1], ARGV[2]) else return 0 end";

export const withConnectionLock = async <T>(
  redis: Redis,
  connectionId: string,
  ttlMs: number,
  task: () => Promise<T>
): Promise<T> => {
  const key = `devgauge:codex:profile-lock:${connectionId}`;
  const token = randomUUID();
  const acquired = await redis.set(key, token, "PX", ttlMs, "NX");
  if (acquired !== "OK") throw new Error("Codex connection is busy");

  const renew = setInterval(() => {
    void redis.eval(RENEW, 1, key, token, String(ttlMs)).catch(() => undefined);
  }, Math.max(1_000, Math.floor(ttlMs / 3)));
  renew.unref();
  try {
    return await task();
  } finally {
    clearInterval(renew);
    await redis.eval(RELEASE, 1, key, token).catch(() => undefined);
  }
};
