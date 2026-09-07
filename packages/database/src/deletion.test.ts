import { describe, expect, it } from "vitest";

import { subjectHash } from "./repositories/deletion.js";

describe("deletion ledger helpers", () => {
  it("hashes subjects deterministically and pseudonymously", () => {
    const a = subjectHash("user-1");
    const b = subjectHash("user-1");
    const c = subjectHash("user-2");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).not.toContain("user-1");
  });
});