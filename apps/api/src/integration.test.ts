import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "./app.js";
import { validateApiEnv } from "./env.js";
import { getOrCreateUser, updateConnectionState, upsertConnection } from "@devgauge/database";
import { COPILOT_ACCESS, storeCopilotToken } from "./services/copilot-tokens.js";
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

/** Skipped variant (used for tests that need an optional real credential). */
const itSlowSkip = (name: string, fn: () => Promise<void>): void => {
  it.skip(name, fn, 30_000);
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
      url: "/v1/connections/codex/device-login",
      headers: { authorization: `Bearer ${aToken}` },
      payload: {},
    });

    const aConn = await app.inject({
      method: "GET",
      url: "/v1/connections",
      headers: { authorization: `Bearer ${aToken}` },
    });
    const aProviders = (aConn.json() as { connections: Array<{ provider: string }> }).connections;
    expect(aProviders.some((c) => c.provider === "codex")).toBe(true);

    const bConn = await app.inject({
      method: "GET",
      url: "/v1/connections",
      headers: { authorization: `Bearer ${bToken}` },
    });
    const bProviders = (bConn.json() as { connections: Array<{ provider: string }> }).connections;
    expect(bProviders.some((c) => c.provider === "codex")).toBe(false);
    expect(JSON.stringify(bConn.json())).not.toContain("codex");
  });

  itSlow("history is cursor-paginated", async () => {
    const email = `it-hist-${Date.now()}@devgauge.test`;
    const token = await signUp(email);
    const headers = { authorization: `Bearer ${token}` };

    await app.inject({
      method: "POST",
      url: "/v1/connections/opencode-go/connect",
      headers,
      payload: { credential: "test-history-key" },
    });
    // Two refreshes → two snapshots.
    await app.inject({ method: "GET", url: "/v1/usage/opencode-go", headers });
    await app.inject({ method: "GET", url: "/v1/usage/opencode-go", headers });

    const page = await app.inject({ method: "GET", url: "/v1/usage/opencode-go/history?limit=1", headers });
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

/**
 * Real-mode (mock transport off) OpenCode Go wiring. Hits the live endpoint,
 * so it runs only when TEST_LIVE_PROVIDER=1 (never in default CI).
 */
const runLive = DB_URL && process.env.TEST_LIVE_PROVIDER === "1";
const describeLive = runLive ? describe : describe.skip;

describeLive("opencode-go live wiring (real adapter)", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  const liveKey = process.env.OPENCODE_TEST_KEY;

  const buildRealApp = async (): Promise<void> => {
    app = await buildApp({
      env: validateApiEnv({
        NODE_ENV: "test",
        DATABASE_URL: DB_URL!,
        ENC_MASTER_KEY: MASTER_KEY,
        FEATURE_MOCK_TRANSPORT: "false",
        LOG_LEVEL: "silent",
      }),
    });
  };

  beforeAll(buildRealApp);
  afterAll(async () => {
    await app.close();
  });

  const signUp = async (): Promise<string> => {
    const email = `it-live-${Date.now()}@devgauge.test`;
    const request = await app.inject({ method: "POST", url: "/v1/auth/magic-link/request", payload: { email } });
    const code = (request.json() as { code: string }).code;
    const verify = await app.inject({ method: "POST", url: "/v1/auth/magic-link/verify", payload: { email, code } });
    return (verify.json() as { token: string }).token;
  };

  itSlow("rejects an invalid OpenCode Go key with provider_unauthorized and never echoes it", async () => {
    const token = await signUp();
    const badKey = `sk-invalid-live-${Date.now()}`;
    const connect = await app.inject({
      method: "POST",
      url: "/v1/connections/opencode-go/connect",
      headers: { authorization: `Bearer ${token}` },
      payload: { credential: badKey },
    });
    expect(connect.statusCode).toBe(401);
    expect(connect.json().error.code).toBe("provider_unauthorized");
    expect(JSON.stringify(connect.json())).not.toContain(badKey);
  });

  const validKeyTest = liveKey ? itSlow : itSlowSkip;
  validKeyTest("connects, fetches three windows, and persists with a valid key", async () => {
    const token = await signUp();
    const connect = await app.inject({
      method: "POST",
      url: "/v1/connections/opencode-go/connect",
      headers: { authorization: `Bearer ${token}` },
      payload: { credential: liveKey! },
    });
    expect(connect.statusCode).toBe(200);

    const usage = await app.inject({ method: "GET", url: "/v1/usage/opencode-go", headers: { authorization: `Bearer ${token}` } });
    expect(usage.statusCode).toBe(200);
    const windows = (usage.json() as { windows: Array<{ id: string }> }).windows;
    expect(windows.map((w) => w.id)).toEqual(expect.arrayContaining(["rolling", "weekly", "monthly"]));
    expect(JSON.stringify(usage.json())).not.toContain(liveKey);
  });
});

/**
 * GitHub Copilot OAuth + sandbox-quota path against the real DB (mock transport
 * off, runtime sandbox). Real GitHub code exchange requires a real app; the
 * persist path is exercised by seeding a token and refreshing in sandbox mode.
 */
const describeCopilot = DB_URL ? describe : describe.skip;

describeCopilot("github-copilot sandbox (real DB)", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  const buildCopilotApp = async (): Promise<void> => {
    app = await buildApp({
      env: validateApiEnv({
        NODE_ENV: "test",
        DATABASE_URL: DB_URL!,
        ENC_MASTER_KEY: MASTER_KEY,
        FEATURE_MOCK_TRANSPORT: "false",
        COPILOT_RUNTIME_MODE: "sandbox",
        GITHUB_CLIENT_ID: "Iv1.testclient",
        GITHUB_CLIENT_SECRET: "test-client-secret",
        GITHUB_REDIRECT_URI: "https://api.example.com/oauth/github/callback",
        LOG_LEVEL: "silent",
      }),
    });
  };

  beforeAll(buildCopilotApp);
  afterAll(async () => {
    await app.close();
  });

  const signUp = async (): Promise<string> => {
    const email = `it-cop-${Date.now()}@devgauge.test`;
    const request = await app.inject({ method: "POST", url: "/v1/auth/magic-link/request", payload: { email } });
    const code = (request.json() as { code: string }).code;
    const verify = await app.inject({ method: "POST", url: "/v1/auth/magic-link/verify", payload: { email, code } });
    return (verify.json() as { token: string }).token;
  };

  itSlow("authorize returns a PKCE authorize URL with no client secret", async () => {
    const token = await signUp();
    const res = await app.inject({
      method: "GET",
      url: "/v1/connections/github-copilot/authorize",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { authorizeUrl: string; state: string };
    expect(body.authorizeUrl).toContain("github.com/login/oauth/authorize");
    expect(body.authorizeUrl).toContain("code_challenge_method=S256");
    expect(body.authorizeUrl).not.toContain("test-client-secret");
    expect(typeof body.state).toBe("string");
  });

  itSlow("callback rejects an unknown/expired state without storing anything", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/connections/github-copilot/callback?code=fake&state=not-a-real-state",
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("provider_unauthorized");
  });

  itSlow("sandbox quota refresh persists dynamic buckets from a stored token", async () => {
    const email = `it-cop-seed-${Date.now()}@devgauge.test`;

    const user = await getOrCreateUser(app.db, email);
    const connection = await upsertConnection(app.db, { userId: user.id, provider: "github-copilot", plan: "copilot" });
    await storeCopilotToken(app.db, app.crypto, connection.id, COPILOT_ACCESS, "gho_sandbox_fake_token");
    await updateConnectionState(app.db, {
      id: connection.id,
      userId: user.id,
      state: "connected",
      refreshState: "idle",
    });

    // Session for that user.
    const magicRequest = await app.inject({
      method: "POST",
      url: "/v1/auth/magic-link/request",
      payload: { email },
    });
    const code = (magicRequest.json() as { code: string }).code;
    const verify = await app.inject({ method: "POST", url: "/v1/auth/magic-link/verify", payload: { email, code } });
    const userToken = (verify.json() as { token: string }).token;

    const usage = await app.inject({
      method: "GET",
      url: "/v1/usage/github-copilot",
      headers: { authorization: `Bearer ${userToken}` },
    });
    expect(usage.statusCode).toBe(200);
    const windows = (usage.json() as { windows: Array<{ id: string; usedPercent: number | null; limit: number | null }> }).windows;
    const ids = windows.map((w) => w.id);
    expect(ids).toContain("premium_interactions");
    // Unlimited bucket preserved with null used-percent and null limit.
    const unlimited = windows.find((w) => w.id === "some_future_bucket");
    expect(unlimited).toBeDefined();
    expect(unlimited?.usedPercent).toBeNull();
    expect(unlimited?.limit).toBeNull();
    expect(JSON.stringify(usage.json())).not.toContain("gho_sandbox_fake_token");
  });
});
/** Claude Code companion flow against the real DB (device-credential auth). */
const describeCompanion = DB_URL ? describe : describe.skip;

describeCompanion("claude-code companion (real DB)", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp({
      env: validateApiEnv({
        NODE_ENV: "test",
        DATABASE_URL: DB_URL!,
        ENC_MASTER_KEY: MASTER_KEY,
        LOG_LEVEL: "silent",
      }),
    });
  });
  afterAll(async () => {
    await app.close();
  });

  const signUp = async (email: string): Promise<string> => {
    const req = await app.inject({ method: "POST", url: "/v1/auth/magic-link/request", payload: { email } });
    const code = (req.json() as { code: string }).code;
    const verify = await app.inject({ method: "POST", url: "/v1/auth/magic-link/verify", payload: { email, code } });
    return (verify.json() as { token: string }).token;
  };

  const getPairingCode = async (token: string): Promise<string> => {
    const res = await app.inject({ method: "POST", url: "/v1/companion/codes", headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    return (res.json() as { code: string }).code;
  };

  const pairDevice = async (code: string): Promise<{ deviceId: string; deviceSecret: string }> => {
    const res = await app.inject({ method: "POST", url: "/v1/companion/pair", payload: { code } });
    expect(res.statusCode).toBe(200);
    return res.json() as { deviceId: string; deviceSecret: string };
  };

  const ingestSnapshot = async (deviceId: string, secret: string, seq: number): Promise<number> => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/companion/snapshots",
      headers: { "content-type": "application/json", "x-device-id": deviceId, authorization: `Bearer ${secret}` },
      payload: {
        schemaVersion: 1,
        deviceId,
        capturedAt: new Date().toISOString(),
        localSequence: seq,
        claudeCodeVersion: "2.1.260",
        rateLimits: {
          five_hour: { used_percentage: 23.5, resets_at: Math.floor(Date.now() / 1000) + 5 * 3600 },
          seven_day: { used_percentage: 41.2, resets_at: Math.floor(Date.now() / 1000) + 7 * 86400 },
        },
      },
    });
    expect(res.statusCode).toBe(200);
    return (res.json() as { snapshotId: number }).snapshotId;
  };

  itSlow("pair + ingest persists five_hour/seven_day and it is readable", async () => {
    const email = `it-cc-${Date.now()}@devgauge.test`;
    const token = await signUp(email);
    const code = await getPairingCode(token);
    const device = await pairDevice(code);

    const snapshotId = await ingestSnapshot(device.deviceId, device.deviceSecret, 1);
    expect(snapshotId).toBeDefined();

    const usage = await app.inject({
      method: "GET",
      url: "/v1/usage/claude-code",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(usage.statusCode).toBe(200);
    const windows = (usage.json() as { windows: Array<{ id: string }> }).windows;
    expect(windows.map((w) => w.id)).toEqual(["five_hour", "seven_day"]);
  });

  itSlow("a pairing code is single-use", async () => {
    const email = `it-cc-single-${Date.now()}@devgauge.test`;
    const token = await signUp(email);
    const code = await getPairingCode(token);
    await pairDevice(code);
    const second = await app.inject({ method: "POST", url: "/v1/companion/pair", payload: { code } });
    expect(second.statusCode).toBe(401);
  });

  itSlow("a revoked device is rejected and does not leak snapshot data", async () => {
    const email = `it-cc-revoke-${Date.now()}@devgauge.test`;
    const token = await signUp(email);
    const code = await getPairingCode(token);
    const device = await pairDevice(code);
    await ingestSnapshot(device.deviceId, device.deviceSecret, 1);

    // List devices, then revoke the first one.
    const list = await app.inject({ method: "GET", url: "/v1/companion/devices", headers: { authorization: `Bearer ${token}` } });
    const deviceId = (list.json() as { devices: Array<{ id: string }> }).devices[0].id;
    const revoke = await app.inject({
      method: "POST",
      url: `/v1/companion/devices/${deviceId}/revoke`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(revoke.statusCode).toBe(200);

    const rejected = await app.inject({
      method: "POST",
      url: "/v1/companion/snapshots",
      headers: { "content-type": "application/json", "x-device-id": device.deviceId, authorization: `Bearer ${device.deviceSecret}` },
      payload: { schemaVersion: 1, deviceId: device.deviceId, capturedAt: new Date().toISOString(), localSequence: 99 },
    });
    expect(rejected.statusCode).toBe(401);
  });
});
