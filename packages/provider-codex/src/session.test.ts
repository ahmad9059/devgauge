import { describe, expect, it } from "vitest";

import { ScriptedDuplex } from "./__fixtures__/harness.js";
import { CodexSession } from "./session.js";
import { CodexProtocolError } from "./session.js";
import { awaitLoginCompletion, readRateLimits, readUsage, refreshCodexUsage, startDeviceCodeLogin, consumeResetCredit } from "./client.js";
import { normalizeRateLimits, normalizeActivitySummary } from "./normalize.js";
import { deviceCodeLoginFixture, rateLimitsByLimitIdFixture, usageReadFixture } from "./__fixtures__/fixtures.js";

const makeSession = (
  onRequest?: (m: { method: string; params?: unknown; id?: number }, d: ScriptedDuplex) => void
): { session: CodexSession; duplex: ScriptedDuplex } => {
  const duplex = new ScriptedDuplex((msg, d) => {
    if (msg.method === "initialize") {
      d.respond(msg.id!, {});
      return;
    }
    onRequest?.(msg, d);
  });
  const session = new CodexSession({ transport: duplex });
  return { session, duplex };
};

describe("CodexSession", () => {
  it("performs initialize (id 0) then an initialized notification, in order", async () => {
    const { session, duplex } = makeSession();
    await session.initialize({ name: "usage_tracker" });
    const first = JSON.parse(duplex.sent[0]!) as { method: string; id: number };
    const second = JSON.parse(duplex.sent[1]!) as { method: string; id?: number };
    expect(first.method).toBe("initialize");
    expect(first.id).toBe(0);
    expect(second.method).toBe("initialized");
    expect(second.id).toBeUndefined();
  });

  it("rejects requests before initialization", async () => {
    const { session } = makeSession();
    await expect(session.request("account/logout", {})).rejects.toThrow(/not initialized/);
  });

  it("correlates responses by id and resolves the right caller", async () => {
    const { session, duplex } = makeSession();
    await session.initialize({ name: "t" });
    const p1 = session.request("account/read", {});
    const p2 = session.request("account/rateLimits/read", {});
    // Respond out of order.
    duplex.respond(2, { ok: "second" });
    duplex.respond(1, { ok: "first" });
    await expect(p2).resolves.toEqual({ ok: "second" });
    await expect(p1).resolves.toEqual({ ok: "first" });
  });

  it("fails pending requests on malformed JSON", async () => {
    const { session, duplex } = makeSession();
    await session.initialize({ name: "t" });
    const pending = session.request("account/read");
    duplex.emitRaw("not-json");
    await expect(pending).rejects.toThrow(/malformed JSON/);
    expect(session.isClosed).toBe(true);
  });

  it("rejects with a protocol error when the peer returns an error", async () => {
    const { session } = makeSession((msg, duplex) => {
      if (msg.method === "account/rateLimits/read") duplex.respondError(msg.id!, "auth required");
    });
    await session.initialize({ name: "t" });
    const p = session.request("account/rateLimits/read");
    await expect(p).rejects.toBeInstanceOf(CodexProtocolError);
  });

  it("rejects pending requests when the process crashes", async () => {
    const { session, duplex } = makeSession();
    await session.initialize({ name: "t" });
    const pending = session.request("account/read");
    duplex.fail(new Error("crash"));
    await expect(pending).rejects.toThrow(/transport failed/);
  });

  it("dispatches interleaved notifications to additive listeners", async () => {
    const { session, duplex } = makeSession();
    await session.initialize({ name: "t" });
    const seen: number[] = [];
    session.onNotification("account/rateLimits/updated", () => seen.push(1));
    session.onNotification("account/rateLimits/updated", () => seen.push(2));
    const pending = session.request("account/read");
    duplex.notify("account/rateLimits/updated", { rateLimits: {} });
    duplex.respond(1, { account: null });
    await pending;
    expect(seen).toEqual([1, 2]);
  });

  it("times out an unanswered request", async () => {
    const { session } = makeSession();
    await session.initialize({ name: "t" });
    await expect(session.request("account/read", {}, 20)).rejects.toThrow(/timed out/);
  });
});

describe("Codex client flows (scripted)", () => {
  it("device-code login returns the url + code", async () => {
    const { session } = makeSession((msg, duplex) => {
      if (msg.method === "account/login/start") duplex.respond(msg.id!, deviceCodeLoginFixture());
    });
    await session.initialize({ name: "t" });
    const login = await startDeviceCodeLogin(session);
    expect(login.userCode).toBe("ABCD-1234");
    expect(login.verificationUrl).toContain("auth.openai.com");
  });

  it("awaitLoginCompletion resolves when the notification fires", async () => {
    const { session, duplex } = makeSession();
    await session.initialize({ name: "t" });
    const pending = awaitLoginCompletion(session, "login-uuid-1");
    duplex.notify("account/login/completed", { loginId: "login-uuid-1", success: true, error: null });
    await expect(pending).resolves.toEqual({ loginId: "login-uuid-1", success: true, error: null });
  });

  it("readRateLimits parses the multi-bucket response", async () => {
    const { session } = makeSession((msg, duplex) => {
      if (msg.method === "account/rateLimits/read") duplex.respond(msg.id!, rateLimitsByLimitIdFixture());
    });
    await session.initialize({ name: "t" });
    const result = await readRateLimits(session);
    expect(result.rateLimitsByLimitId?.codex?.primary?.usedPercent).toBe(25);
  });

  it("readUsage parses nullable summary and buckets", async () => {
    const { session } = makeSession((msg, duplex) => {
      if (msg.method === "account/usage/read") duplex.respond(msg.id!, usageReadFixture());
    });
    await session.initialize({ name: "t" });
    const result = await readUsage(session);
    expect(result.summary?.lifetimeTokens).toBe(1234567);
    expect(result.dailyUsageBuckets?.length).toBe(1);
  });

  it("consumeResetCredit maps known outcomes and rejects unknown", async () => {
    const outcomes = ["reset", "noCredit", "surprise"];
    const { session } = makeSession((msg, duplex) => {
      if (msg.method === "account/rateLimitResetCredit/consume") {
        duplex.respond(msg.id!, { outcome: outcomes.shift() });
      }
    });
    await session.initialize({ name: "t" });
    await expect(consumeResetCredit(session, "idem-1", "credit-1")).resolves.toBe("reset");
    await expect(consumeResetCredit(session, "idem-2", "credit-2")).resolves.toBe("noCredit");
    await expect(consumeResetCredit(session, "idem-3", "credit-3")).rejects.toThrow(/malformed data/);
  });

  it("retains a valid quota result when the separate activity read fails", async () => {
    const { session } = makeSession((msg, duplex) => {
      if (msg.method === "account/rateLimits/read") duplex.respond(msg.id!, rateLimitsByLimitIdFixture());
      if (msg.method === "account/usage/read") duplex.respondError(msg.id!, "activity unavailable");
    });
    await session.initialize({ name: "t" });
    const result = await refreshCodexUsage(session);
    expect(result.rateLimits.rateLimitsByLimitId?.codex?.primary?.usedPercent).toBe(25);
    expect(result.usage).toBeNull();
    expect(result.activityError?.message).toContain("activity unavailable");
  });
});

describe("normalizeRateLimits", () => {
  it("emits dynamic limit ids + actual durations and clamps", () => {
    const usage = normalizeRateLimits(rateLimitsByLimitIdFixture() as never, new Date("2026-09-05T12:00:00Z"));
    expect(usage.provider).toBe("codex");
    expect(usage.plan).toBe("plus");
    expect(usage.windows.map((w) => w.id)).toEqual(["codex:primary", "codex:secondary"]);
    expect(usage.windows[0]).toMatchObject({ usedPercent: 25, windowSeconds: 18000, state: "normal" });
    expect(usage.windows[0]?.resetsAt).toBe(new Date(1788600000 * 1000).toISOString());
    expect(usage.windows[1]?.label).toContain("1 week");
  });
});

describe("normalizeActivitySummary", () => {
  it("returns null when every value is absent", () => {
    expect(normalizeActivitySummary({})).toBeNull();
  });
  it("maps present values", () => {
    const s = normalizeActivitySummary({ lifetimeTokens: 100, currentStreakDays: 2 });
    expect(s?.lifetimeTokens).toBe(100);
    expect(s?.currentStreakDays).toBe(2);
    expect(s?.peakDailyTokens).toBeNull();
  });
});
