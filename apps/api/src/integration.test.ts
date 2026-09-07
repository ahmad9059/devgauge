import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "./app.js";
import { validateApiEnv } from "./env.js";

/**
 * Integration tests against a real PostgreSQL (DATABASE_URL) with the
 * FEATURE_MOCK_TRANSPORT adapter. Skipped when DATABASE_URL is absent so CI
 * without a database stays green; run locally with `DATABASE_URL` set.
 */

const DB_URL = process.env.DATABASE_URL;
const MASTER_KEY = process.env.ENC_MASTER_KEY ?? "integration-test-master-key-0123456789abcdef";

const describeIntegration = DB_URL ? describe : describe.skip;

/** Neon free tier scale-to-zero makes cold queries slow; allow up to 30s. */
const itSlow = (name: string, fn: () => Promise<void>): void => {
  it(name, fn, 30_000);
};

describeIntegration("control plane integration (real DB)", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  const signUp = async (email: string): Promise<string> => {
    const request = await app.inject({
      method: "POST",
      url: "/v1/auth/magic-link/request",
      payload: { email },
    });
    const code = (request.json() as { code?: string }).code;
    expect(code).toBeDefined();

    const verify = await app.inject({
      method: "POST",
      url: "/v1/auth/magic-link/verify",
      payload: { email, code: code! },
    });
    expect(verify.statusCode).toBe(200);
    return (verify.json() as { token: string }).token;
  };

  beforeAll(async () => {
    app = await buildApp({
      env: validateApiEnv({
        NODE_ENV: "test",
        DATABASE_URL: DB_URL!,
        ENC_MASTER_KEY: MASTER_KEY,
        FEATURE_MOCK_TRANSPORT: "true",
        LOG_LEVEL: "silent",
      }),
    });
  });

  afterAll(async () => {
    await app.close();
  });

  itSlow("magic-link signup returns a working session", async () => {
    const email = `it-${Date.now()}@devgauge.test`;
    const token = await signUp(email);

    const me = await app.inject({ method: "GET", url: "/v1/me", headers: { authorization: `Bearer ${token}` } });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toMatchObject({ email, lifecycleStatus: "active" });
  });

  itSlow("rejects requests without a valid session", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/me" });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe("unauthenticated");
  });

  itSlow("connect + usage roundtrip persists normalized snapshots", async () => {
    const email = `it-usage-${Date.now()}@devgauge.test`;
    const token = await signUp(email);
    const headers = { authorization: `Bearer ${token}` };

    const connect = await app.inject({
      method: "POST",
      url: "/v1/connections/opencode-go/connect",
      headers,
      payload: { credential: "sk-canary-connect-roundtrip" },
    });
    expect(connect.statusCode).toBe(200);

    const usage = await app.inject({ method: "GET", url: "/v1/usage", headers });
    expect(usage.statusCode).toBe(200);
    const body = usage.json() as {
      providers: Array<{ provider: string; windows: unknown[] }>;
    };
    expect(body.providers.length).toBeGreaterThan(0);
    const opencode = body.providers.find((p) => p.provider === "opencode-go");
    expect(opencode).toBeDefined();
    expect(opencode!.windows.length).toBeGreaterThan(0);
    expect(JSON.stringify(body)).not.toContain("sk-canary-connect-roundtrip");
  });

  itSlow("isolates users: A's connections/usage are invisible to B", async () => {
    const aToken = await signUp(`it-a-${Date.now()}@devgauge.test`);
    const bToken = await signUp(`it-b-${Date.now()}@devgauge.test`);

    await app.inject({
      method: "POST",
      url: "/v1/connections/github-copilot/connect",
      headers: { authorization: `Bearer ${aToken}` },
      payload: { credential: "a-secret" },
    });

    const aConn = await app.inject({
      method: "GET",
      url: "/v1/connections",
      headers: { authorization: `Bearer ${aToken}` },
    });
    const aProviders = (aConn.json() as { connections: Array<{ provider: string }> }).connections;
    expect(aProviders.some((c) => c.provider === "github-copilot")).toBe(true);

    const bConn = await app.inject({
      method: "GET",
      url: "/v1/connections",
      headers: { authorization: `Bearer ${bToken}` },
    });
    const bProviders = (bConn.json() as { connections: Array<{ provider: string }> }).connections;
    expect(bProviders.some((c) => c.provider === "github-copilot")).toBe(false);
    expect(JSON.stringify(bConn.json())).not.toContain("github-copilot");
  });

  itSlow("history is cursor-paginated", async () => {
    const email = `it-hist-${Date.now()}@devgauge.test`;
    const token = await signUp(email);
    const headers = { authorization: `Bearer ${token}` };

    await app.inject({
      method: "POST",
      url: "/v1/connections/codex/connect",
      headers,
      payload: { credential: "x" },
    });
    // Two refreshes → two snapshots.
    await app.inject({ method: "GET", url: "/v1/usage/codex", headers });
    await app.inject({ method: "GET", url: "/v1/usage/codex", headers });

    const page = await app.inject({ method: "GET", url: "/v1/usage/codex/history?limit=1", headers });
    expect(page.statusCode).toBe(200);
    const body = page.json();
    expect(body.items.length).toBe(1);
    expect(typeof body.nextCursor).toBe("string");
  });

  itSlow("account deletion tombstoned + session revoked", async () => {
    const email = `it-del-${Date.now()}@devgauge.test`;
    const token = await signUp(email);
    const headers = { authorization: `Bearer ${token}` };

    const del = await app.inject({ method: "DELETE", url: "/v1/me", headers });
    expect(del.statusCode).toBe(200);

    const after = await app.inject({ method: "GET", url: "/v1/me", headers });
    expect(after.statusCode).toBe(401);
  });
});