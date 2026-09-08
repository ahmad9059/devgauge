import { describe, expect, it } from "vitest";
import { ProviderError } from "@devgauge/provider-core";

import { fetchOpenCodeGoUsage, type FetchLike } from "./client.js";
import {
  authErrorBody,
  badJsonBody,
  entitlementErrorBody,
  missingFieldsFixture,
  overHundredFixture,
  rateLimitedFixture,
  successFixture,
  unknownShape2xx,
} from "./__fixtures__/fixtures.js";

const okFetch = (body: unknown): FetchLike =>
  (async () => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } })) as FetchLike;

const statusFetch = (status: number, body: string): FetchLike =>
  (async () => new Response(body, { status })) as FetchLike;

const FIXED_NOW = () => new Date("2026-09-05T12:00:00.000Z");

describe("fetchOpenCodeGoUsage", () => {
  it("normalizes all three windows on success", async () => {
    const usage = await fetchOpenCodeGoUsage({ apiKey: "sk-test", fetchImpl: okFetch(successFixture()), now: FIXED_NOW });
    expect(usage.provider).toBe("opencode-go");
    expect(usage.windows.map((w) => w.id)).toEqual(["rolling", "weekly", "monthly"]);
    expect(usage.windows[0]).toMatchObject({ usedPercent: 12, remainingPercent: 88, label: "5 hour", resetsAt: "2026-09-05T18:00:00.000Z" });
    expect(usage.diagnostics.rolling?.upstreamPercent).toBe(12);
    expect(usage.fetchedAt).toBe("2026-09-05T12:00:00.000Z");
    expect(JSON.stringify(usage)).not.toContain("sk-test");
  });

  it("clamps display percents but keeps upstream in diagnostics", async () => {
    const usage = await fetchOpenCodeGoUsage({ apiKey: "k", fetchImpl: okFetch(overHundredFixture()), now: FIXED_NOW });
    const rolling = usage.windows.find((w) => w.id === "rolling")!;
    expect(rolling.usedPercent).toBe(100);
    expect(usage.diagnostics.rolling?.upstreamPercent).toBe(115);
    const weekly = usage.windows.find((w) => w.id === "weekly")!;
    expect(weekly.usedPercent).toBe(0);
  });

  it("maps rate-limited to limited state and tolerates a null window", async () => {
    const usage = await fetchOpenCodeGoUsage({ apiKey: "k", fetchImpl: okFetch(rateLimitedFixture()), now: FIXED_NOW });
    const rolling = usage.windows.find((w) => w.id === "rolling")!;
    expect(rolling.state).toBe("limited");
    expect(usage.windows.some((w) => w.id === "monthly")).toBe(false);
    expect(usage.windows.some((w) => w.id === "weekly")).toBe(true);
  });

  it("keeps valid siblings when one window is absent", async () => {
    const usage = await fetchOpenCodeGoUsage({ apiKey: "k", fetchImpl: okFetch(missingFieldsFixture()), now: FIXED_NOW });
    expect(usage.windows.map((w) => w.id)).toEqual(["rolling", "monthly"]);
  });

  it("401 AuthError maps to provider_unauthorized", async () => {
    const err = await fetchOpenCodeGoUsage({ apiKey: "bad", fetchImpl: statusFetch(401, authErrorBody) }).catch((e) => e);
    expect(err).toBeInstanceOf(ProviderError);
    expect((err as ProviderError).code).toBe("provider_unauthorized");
    expect((err as ProviderError).retryable).toBe(false);
  });

  it("403 EntitlementError maps to entitlement_required", async () => {
    const err = await fetchOpenCodeGoUsage({ apiKey: "bad", fetchImpl: statusFetch(403, entitlementErrorBody) }).catch((e) => e);
    expect((err as ProviderError).code).toBe("entitlement_required");
  });

  it("5xx maps to retryable transient_upstream", async () => {
    const err = await fetchOpenCodeGoUsage({ apiKey: "k", fetchImpl: statusFetch(503, "boom") }).catch((e) => e);
    expect((err as ProviderError).code).toBe("transient_upstream");
    expect((err as ProviderError).retryable).toBe(true);
  });

  it("malformed 2xx maps to contract_drift", async () => {
    const a = await fetchOpenCodeGoUsage({ apiKey: "k", fetchImpl: statusFetch(200, badJsonBody) }).catch((e) => e);
    expect((a as ProviderError).code).toBe("contract_drift");
    const b = await fetchOpenCodeGoUsage({ apiKey: "k", fetchImpl: statusFetch(200, unknownShape2xx) }).catch((e) => e);
    expect((b as ProviderError).code).toBe("contract_drift");
  });

  it("a redirect is rejected (no cross-host following)", async () => {
    const redirecting: FetchLike = (async () => new Response("", { status: 302 })) as FetchLike;
    const err = await fetchOpenCodeGoUsage({ apiKey: "k", fetchImpl: redirecting }).catch((e) => e);
    expect(err).toBeInstanceOf(ProviderError);
  });

  it("never leaks the api key through errors or body", async () => {
    const err = await fetchOpenCodeGoUsage({ apiKey: "sk-top-secret-canary", fetchImpl: statusFetch(401, authErrorBody) }).catch((e) => e);
    expect(JSON.stringify(err)).not.toContain("sk-top-secret-canary");
  });
});