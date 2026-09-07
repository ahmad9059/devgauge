import { describe, expect, it } from "vitest";

import { doctorCommand, pairCommand, statusCommand } from "./commands.js";
import { ExitCode } from "./exit.js";

describe("companion command stubs", () => {
  it("reports a usage error when pairing without a code", () => {
    const result = pairCommand({});
    expect(result.code).toBe(ExitCode.Success);
    expect(result.message).toContain("missing --code");
  });

  it("returns structured metadata for status", () => {
    const result = statusCommand();
    expect(result.code).toBe(ExitCode.Success);
    expect(result.data?.command).toBe("status");
    expect(result.data?.implementedInPhase).toBe(8);
  });

  it("exposes a doctor command", () => {
    const result = doctorCommand();
    expect(result.message).toContain("doctor");
  });
});