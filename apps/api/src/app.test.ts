import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { EnvValidationError } from "@devgauge/config";

import { buildApp } from "./app.js";
import type { ApiEnv } from "./env.js";
import { validateApiEnv } from "./env.js";

let app: Awaited<ReturnType<typeof buildApp>>;
let env: ApiEnv;

const testEnv = (overrides: Partial<Record<string, string>> = {}): ApiEnv =>
  validateApiEnv({
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
    ...overrides,
  });

const buildTestApp = async (dependencies: Parameters<typeof buildApp>[0]["dependencies"]) =>
  buildApp({
    env: testEnv(),
    dependencies,
  });

describe("API skeleton", () => {
  beforeAll(async () => {
    env = testEnv();
    app = await buildApp({ env });
  });

  afterAll(async () => {
    await app.close();
  });

  it("serves liveness without dependencies", async () => {
    const response = await app.inject({ method: "GET", url: "/health/live" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });

  it("reports readiness ok when all dependencies pass", async () => {
    const local = await buildTestApp([]);
    const response = await local.inject({ method: "GET", url: "/health/ready" });
    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe("ok");
    await local.close();
  });

  it("reports readiness unavailable when a dependency fails", async () => {
    const local = await buildTestApp([
      {
        name: "postgres",
        check: async () => {
          throw new Error("connection refused");
        },
      },
    ]);
    const response = await local.inject({ method: "GET", url: "/health/ready" });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      status: "unavailable",
      services: [{ name: "postgres", status: "unavailable" }],
    });
    await local.close();
  });

  it("exposes versioning metadata", async () => {
    const response = await app.inject({ method: "GET", url: "/v1/version" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      apiVersion: "v1",
      minClientVersion: "0.1.0",
    });
  });

  it("returns the standard error envelope for unknown routes", async () => {
    const response = await app.inject({ method: "GET", url: "/does-not-exist" });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("not_found");
    expect(typeof response.json().error.requestId).toBe("string");
  });

  it("sends security headers", async () => {
    const response = await app.inject({ method: "GET", url: "/health/live" });
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("exposes a deterministic OpenAPI document in non-production", async () => {
    const response = await app.inject({ method: "GET", url: "/documentation/json" });
    expect(response.statusCode).toBe(200);
    const doc = response.json();
    expect(doc.paths["/v1/usage"]).toBeDefined();
  });
});

describe("validateApiEnv", () => {
  it("fails closed in production when required services are missing", () => {
    let error: unknown;
    try {
      testEnv({ NODE_ENV: "production" });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(EnvValidationError);
    const issues = (error as EnvValidationError).issues;
    expect(issues).toContain("DATABASE_URL required in production");
    expect(issues).toContain("REDIS_URL required in production");
  });

  it("accepts production when required services are present", () => {
    const parsed = testEnv({ NODE_ENV: "production", DATABASE_URL: "postgres://x", REDIS_URL: "redis://x" });
    expect(parsed.NODE_ENV).toBe("production");
  });
});