import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ApiClient } from "./api-client.js";
import { doctorCommand, pairCommand, statusCommand } from "./commands.js";
import { ExitCode } from "./exit.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "devgauge-cmd-"));
  process.env.DEVGAUGE_COMPANION_DIR = dir;
  process.env.DEVGAUGE_ALLOW_FILE_CREDENTIALS = "1";
});
afterEach(() => {
  delete process.env.DEVGAUGE_COMPANION_DIR;
  delete process.env.DEVGAUGE_ALLOW_FILE_CREDENTIALS;
});

const fakeClient = (): ApiClient =>
  new ApiClient("http://test", (async (input: string) => {
    if (input.endsWith("/pair")) {
      return new Response(
        JSON.stringify({ deviceId: "dev_1", deviceSecret: "secret_1", accountEmail: "a@b.c", alias: "dev" }),
        { status: 200 }
      );
    }
    if (input.endsWith("/snapshots")) {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    return new Response(JSON.stringify({ error: { code: "not_found" } }), { status: 404 });
  }) as ApiClient["fetchImpl"]);

describe("companion commands", () => {
  it("pair usage error without a code", async () => {
    const result = await pairCommand({});
    expect(result.code).toBe(ExitCode.UsageError);
    expect(result.message).toContain("requires --code");
  });

  it("pairs via the API and persists a credential", async () => {
    const result = await pairCommand({ code: "ABC-123", apiClient: fakeClient() });
    expect(result.code).toBe(ExitCode.Success);
    expect(result.message).toContain("dev_1");

    const status = await statusCommand();
    expect(status.data?.paired).toBe(true);
    expect(status.data?.deviceId).toBe("dev_1");
  });

  it("fails pairing when the code is rejected", async () => {
    const client = new ApiClient("http://test", (async () =>
      new Response(JSON.stringify({ error: { code: "pair_failed", message: "Bad code" } }), { status: 400 })) as ApiClient["fetchImpl"]);
    const result = await pairCommand({ code: "BAD", apiClient: client });
    expect(result.code).toBe(ExitCode.RuntimeError);
  });

  it("status before pairing reports unpaired", async () => {
    const result = await statusCommand();
    expect(result.code).toBe(ExitCode.Success);
    expect(result.data?.paired).toBe(false);
  });

  it("doctor without a credential reports issues", async () => {
    const result = await doctorCommand();
    expect(result.data?.credential).toBe(false);
  });
});