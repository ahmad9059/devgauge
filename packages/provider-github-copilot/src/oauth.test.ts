import { describe, expect, it } from "vitest";

import {
  buildAuthorizeUrl,
  exchangeCode,
  GITHUB_AUTHORIZE_URL,
  type FetchLike,
} from "./oauth.js";
import { hashToken, pkceChallenge, randomPkceVerifier, randomState } from "./normalize.js";

const config = { clientId: "Iv1.test", clientSecret: "secret-canary-abc", redirectUri: "https://api.example.com/oauth/github/callback" };
const state = randomState();
const verifier = randomPkceVerifier();

const tokenFetch = (overrides: Record<string, unknown> = {}): FetchLike =>
  (async (input) => {
    if (String(input) === "https://api.github.com/user") {
      return new Response(JSON.stringify({ id: 12345, login: "octocat" }), { status: 200 });
    }
    return new Response(
      JSON.stringify({
        access_token: "gho_test_access_123",
        token_type: "bearer",
        scope: "read:user",
        expires_in: 28800,
        refresh_token: "ghr_test_refresh",
        refresh_token_expires_in: 15724800,
        ...overrides,
      }),
      { status: 200 }
    );
  }) as FetchLike;

describe("oauth helpers", () => {
  it("builds an authorize URL with PKCE and no client secret", () => {
    const url = buildAuthorizeUrl(config, state, verifier, "read:user");
    expect(url.startsWith(GITHUB_AUTHORIZE_URL)).toBe(true);
    expect(url).toContain(`client_id=${config.clientId}`);
    expect(url).toContain(`code_challenge_method=S256`);
    expect(url).toContain(`code_challenge=${encodeURIComponent(pkceChallenge(verifier))}`);
    expect(url).toContain(`state=${state}`);
    expect(url).not.toContain(config.clientSecret);
  });

  it("exchanges a code for tokens and verifies the user", async () => {
    const result = await exchangeCode(config, "code123", verifier, tokenFetch());
    expect(result.accessToken).toBe("gho_test_access_123");
    expect(result.refreshToken).toBe("ghr_test_refresh");
    expect(result.user).toEqual({ id: 12345, login: "octocat" });
  });

  it("maps a token-endpoint error to provider_unauthorized", async () => {
    const errorFetch: FetchLike = (async () =>
      new Response(JSON.stringify({ error: "bad_verification_code", error_description: "The code passed is incorrect" }), { status: 200 })) as FetchLike;
    const err = await exchangeCode(config, "bad", verifier, errorFetch).catch((e) => e);
    expect(err.code).toBe("provider_unauthorized");
    expect(String(err.message)).toContain("incorrect");
  });

  it("never leaks the secret or token through errors", async () => {
    const errorFetch: FetchLike = (async () => new Response("nope", { status: 500 })) as FetchLike;
    const err = await exchangeCode(config, "code", verifier, errorFetch).catch((e) => e);
    expect(JSON.stringify(err)).not.toContain("secret-canary-abc");
    expect(JSON.stringify(err)).not.toContain("gho_");
  });

  it("hashes tokens deterministically for storage", () => {
    const a = hashToken("gho_x");
    const b = hashToken("gho_x");
    expect(a).toBe(b);
    expect(a).not.toContain("gho_x");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});