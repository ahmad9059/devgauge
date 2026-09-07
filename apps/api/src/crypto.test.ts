import { describe, expect, it } from "vitest";

import { createCryptoService } from "./plugins/crypto.js";

const CANARY = "sk-canary-9f3b2c1d-usage-tracker";

describe("crypto envelope", () => {
  const crypto = createCryptoService("test-master-key-0123456789abcdef0123456789abcdef");

  it("seals and opens plaintext", () => {
    const envelope = crypto.seal(Buffer.from(CANARY, "utf8"));
    const opened = crypto.open(envelope).toString("utf8");
    expect(opened).toBe(CANARY);
  });

  it("never stores the plaintext in the envelope fields", () => {
    const envelope = crypto.seal(Buffer.from(CANARY, "utf8"));
    expect(envelope.ciphertext.toString("utf8")).not.toContain("canary");
    expect(envelope.wrappedDataKey.toString("utf8")).not.toContain("canary");
  });

  it("rewrap keeps plaintext recoverable without exposing it", () => {
    const envelope = crypto.seal(Buffer.from(CANARY, "utf8"));
    const rewrapped = crypto.rewrap(envelope);
    expect(rewrapped.keyVersion).toBe(1);
    expect(rewrapped.wrappedDataKey.equals(envelope.wrappedDataKey)).toBe(false);
    expect(crypto.open(rewrapped).toString("utf8")).toBe(CANARY);
  });

  it("throws on tampered ciphertext (auth tag failure)", () => {
    const envelope = crypto.seal(Buffer.from(CANARY, "utf8"));
    const tampered = Buffer.from(envelope.ciphertext);
    tampered[tampered.length - 1] = tampered[tampered.length - 1]! ^ 0xff;
    expect(() => crypto.open({ ...envelope, ciphertext: tampered })).toThrow();
  });

  it("produces unique envelopes per seal", () => {
    const a = crypto.seal(Buffer.from(CANARY, "utf8"));
    const b = crypto.seal(Buffer.from(CANARY, "utf8"));
    expect(a.ciphertext.equals(b.ciphertext)).toBe(false);
    expect(a.wrappedDataKey.equals(b.wrappedDataKey)).toBe(false);
  });
});