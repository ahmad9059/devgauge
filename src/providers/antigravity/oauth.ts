// Google OAuth (public client + PKCE) used by Antigravity CLI. The client id is
// the Antigravity CLI application's public OAuth client; there is no secret, so
// PKCE is required. Owner-authorized; treated as an experimental integration.
export const ANTIGRAVITY_CLIENT_ID =
  'REDACTED.apps.googleusercontent.com';
export const ANTIGRAVITY_REDIRECT_URI =
  'https://antigravity.google/oauth-callback';
export const ANTIGRAVITY_AUTH_URL = 'https://accounts.google.com/o/oauth2/auth';
export const ANTIGRAVITY_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const ANTIGRAVITY_SCOPES = [
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/cclog',
  'https://www.googleapis.com/auth/experimentsandconfigs',
  'https://www.googleapis.com/auth/aicode',
  'openid',
];

/** Hosts the Antigravity sign-in flow may contact. */
export const ANTIGRAVITY_HOSTS = [
  'accounts.google.com',
  'oauth2.googleapis.com',
  'cloudcode-pa.googleapis.com',
  'antigravity.google',
];

function encodeForm(params: Record<string, string>): string {
  return Object.entries(params)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    )
    .join('&');
}

export function buildAuthorizeUrl(input: {
  challenge: string;
  state: string;
}): string {
  const query = encodeForm({
    access_type: 'offline',
    client_id: ANTIGRAVITY_CLIENT_ID,
    code_challenge: input.challenge,
    code_challenge_method: 'S256',
    prompt: 'consent',
    redirect_uri: ANTIGRAVITY_REDIRECT_URI,
    response_type: 'code',
    scope: ANTIGRAVITY_SCOPES.join(' '),
    state: input.state,
  });
  return `${ANTIGRAVITY_AUTH_URL}?${query}`;
}

export type AntigravityCallback =
  { kind: 'code'; code: string } | { kind: 'error'; error: string };

function queryParam(url: string, name: string): string | null {
  const queryIndex = url.indexOf('?');
  if (queryIndex < 0) return null;
  const query = url.slice(queryIndex + 1).split('#')[0];
  for (const pair of query.split('&')) {
    const equals = pair.indexOf('=');
    const key = decodeURIComponent(equals < 0 ? pair : pair.slice(0, equals));
    if (key === name) {
      return decodeURIComponent(equals < 0 ? '' : pair.slice(equals + 1));
    }
  }
  return null;
}

/** Recognizes the OAuth redirect to https://antigravity.google/oauth-callback. */
export function parseCallbackUrl(url: string): AntigravityCallback | null {
  if (!/^https:\/\/antigravity\.google\/oauth-callback(\?|#|$)/.test(url)) {
    return null;
  }
  const code = queryParam(url, 'code');
  if (code) return { kind: 'code', code };
  const error = queryParam(url, 'error');
  if (error) return { kind: 'error', error };
  return null;
}

export function tokenExchangeBody(input: {
  code: string;
  verifier: string;
}): string {
  return encodeForm({
    client_id: ANTIGRAVITY_CLIENT_ID,
    code: input.code,
    code_verifier: input.verifier,
    grant_type: 'authorization_code',
    redirect_uri: ANTIGRAVITY_REDIRECT_URI,
  });
}

export type AntigravityToken = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
};

export function parseTokenResponse(json: unknown): AntigravityToken {
  const value = json as {
    access_token?: unknown;
    refresh_token?: unknown;
    expires_in?: unknown;
  };
  if (!value || typeof value.access_token !== 'string') {
    throw new Error('Antigravity token exchange failed');
  }
  return {
    accessToken: value.access_token,
    ...(typeof value.refresh_token === 'string'
      ? { refreshToken: value.refresh_token }
      : {}),
    ...(typeof value.expires_in === 'number'
      ? { expiresIn: value.expires_in }
      : {}),
  };
}
