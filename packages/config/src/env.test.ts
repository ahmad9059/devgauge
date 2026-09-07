import { describe, expect, it } from "vitest";
import { z } from "zod";

import { redactSecrets, validateEnv } from "./env.js";

describe("validateEnv", () => {
  const schema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]),
    PORT: z.coerce.number().int().positive(),
  });

  it("returns parsed values for a complete source", () => {
    const env = validateEnv(schema, { NODE_ENV: "test", PORT: "8080" });
    expect(env).toEqual({ NODE_ENV: "test", PORT: 8080 });
  });

  it("fails closed when a required value is missing", () => {
    expect(() => validateEnv(schema, { NODE_ENV: "test" })).toThrowError(
      /refusing to start/i
    );
  });
});

describe("redactSecrets", () => {
  it("redacts sensitive keys recursively", () => {
    const redacted = redactSecrets({
      apiKey: "sk-secret",
      name: "public",
      nested: { client_secret: "s3cr3t", count: 3 },
      list: [{ access_token: "tok" }],
    });
    expect(redacted).toEqual({
      apiKey: "***REDACTED***",
      name: "public",
      nested: { client_secret: "***REDACTED***", count: 3 },
      list: [{ access_token: "***REDACTED***" }],
    });
  });

  it("does not mutate the original object", () => {
    const original = { token: "keep-me", other: 1 };
    const redacted = redactSecrets(original);
    expect(original.token).toBe("keep-me");
    expect(redacted.token).toBe("***REDACTED***");
  });
});