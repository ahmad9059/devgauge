import type { GithubTokenResponse, GithubUser } from "./schema.js";
import { githubTokenResponseSchema, githubUserSchema } from "./schema.js";
import { exchangeError, oauthError, refreshError } from "./errors.js";
import { pkceChallenge } from "./normalize.js";

export const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
export const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
export const GITHUB_API_USER = "https://api.github.com/user";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface GithubAppConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface AccessTokenResult {
  accessToken: string;
  refreshToken: string | null;
  expiresInSeconds: number | null;
  user: GithubUser;
}

/** Builds the GitHub authorize URL (never contains the client secret). */
export const buildAuthorizeUrl = (
  config: GithubAppConfig,
  state: string,
  pkceVerifier: string,
  scope: string
): string => {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state,
    code_challenge: pkceChallenge(pkceVerifier),
    code_challenge_method: "S256",
    scope,
  });
  return `${GITHUB_AUTHORIZE_URL}?${params.toString()}`;
};

/** Exchanges an authorization code for tokens and verifies the user identity. */
export const exchangeCode = async (
  config: GithubAppConfig,
  code: string,
  pkceVerifier: string,
  fetchImpl: FetchLike = fetch
): Promise<AccessTokenResult> => {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.redirectUri,
    code_verifier: pkceVerifier,
  });

  let response: Response;
  try {
    response = await fetchImpl(GITHUB_TOKEN_URL, {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  } catch {
    throw refreshError("token endpoint unreachable");
  }

  const text = await response.text();
  if (!response.ok) throw exchangeError(text);
  const parsed: GithubTokenResponse = githubTokenResponseSchema.parse(JSON.parse(text));
  if (parsed.error) throw exchangeError(parsed.error_description ?? parsed.error);
  if (!parsed.access_token) throw exchangeError("missing access token");
  const accessToken = parsed.access_token;
  const refreshToken = parsed.refresh_token ?? null;
  const expiresInSeconds = parsed.expires_in ?? null;

  // Verify identity with the exchanged token (server-side; never leaked).
  const user = await fetchUser(accessToken, fetchImpl);

  return { accessToken, refreshToken, expiresInSeconds, user };
};

/** Refreshes an expiring token pair (GitHub App user tokens). */
export const refreshAccessToken = async (
  config: GithubAppConfig,
  refreshTokenValue: string,
  fetchImpl: FetchLike = fetch
): Promise<{ accessToken: string; refreshToken: string | null; expiresInSeconds: number | null }> => {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshTokenValue,
  });

  let response: Response;
  try {
    response = await fetchImpl(GITHUB_TOKEN_URL, {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  } catch {
    throw refreshError("token endpoint unreachable");
  }

  const text = await response.text();
  if (!response.ok) throw refreshError(text.slice(0, 200));
  const parsed: GithubTokenResponse = githubTokenResponseSchema.parse(JSON.parse(text));
  if (parsed.error) throw oauthError(parsed.error_description ?? parsed.error);
  if (!parsed.access_token) throw refreshError("missing access token");
  return {
    accessToken: parsed.access_token,
    refreshToken: parsed.refresh_token ?? null,
    expiresInSeconds: parsed.expires_in ?? null,
  };
};

/** Fetches the authenticated GitHub user (used to bind the connection). */
export const fetchUser = async (accessToken: string, fetchImpl: FetchLike = fetch): Promise<GithubUser> => {
  let response: Response;
  try {
    response = await fetchImpl(GITHUB_API_USER, { headers: { authorization: `Bearer ${accessToken}` } });
  } catch {
    throw refreshError("user endpoint unreachable");
  }
  if (!response.ok) throw exchangeError(`HTTP ${response.status}`);
  return githubUserSchema.parse(await response.json());
};