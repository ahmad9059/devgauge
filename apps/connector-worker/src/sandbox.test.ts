import { describe, expect, it } from "vitest";

import {
  FORBIDDEN_ENV_FRAGMENTS,
  probeForForbiddenEnv,
  scrubEnv,
  describeSandboxPolicy,
} from "./sandbox.js";

describe("scrubEnv", () => {
  it("keeps only allowlisted variables", () => {
    const scrubbed = scrubEnv({
      PATH: "/usr/bin",
      TMPDIR: "/tmp/x",
      DATABASE_URL: "postgres://user:pass@db/app",
      REDIS_URL: "redis://:secret@redis/0",
      KMS_KEY_ID: "arn:aws:kms:...",
      AWS_ACCESS_KEY_ID: "AKIA...",
      HOME: "/home/dev",
    });
    expect(scrubbed).toEqual({ PATH: "/usr/bin", TMPDIR: "/tmp/x", HOME: "/home/dev" });
  });
});

describe("probeForForbiddenEnv", () => {
  it("detects leaked service credentials and cloud metadata keys", () => {
    const result = probeForForbiddenEnv({
      PATH: "/usr/bin",
      DATABASE_URL: "postgres://...",
      AWS_ACCESS_KEY_ID: "AKIA...",
      GOOGLE_APPLICATION_CREDENTIALS: "/x.json",
    });
    expect(result.ok).toBe(false);
    expect(result.leaked).toContain("DATABASE_URL");
    expect(result.leaked).toContain("AWS_ACCESS_KEY_ID");
    expect(result.leaked).toContain("GOOGLE_APPLICATION_CREDENTIALS");
  });

  it("passes a scrubbed environment", () => {
    const scrubbed = scrubEnv({ PATH: "/usr/bin", TMPDIR: "/tmp", DATABASE_URL: "postgres://x" });
    const result = probeForForbiddenEnv(scrubbed);
    expect(result.ok).toBe(true);
    expect(result.leaked).toEqual([]);
  });

  it("covers the full forbidden fragment set", () => {
    for (const fragment of FORBIDDEN_ENV_FRAGMENTS) {
      const probe = probeForForbiddenEnv({ [fragment]: "value" });
      expect(probe.ok, `fragment ${fragment} must be detected`).toBe(false);
    }
  });
});

describe("describeSandboxPolicy", () => {
  it("documents every enforceable sandbox boundary", () => {
    const policy = describeSandboxPolicy();
    expect(policy).toContain("unprivileged uid");
    expect(policy).toContain("no cloud metadata");
    expect(policy).toContain("no db/redis/kms credentials");
    expect(policy).toContain("supervisor-owned stdio");
  });
});