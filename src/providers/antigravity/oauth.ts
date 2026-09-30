// Google OAuth for Antigravity / Cloud Code Assist. Google's secure-browser
// policy blocks OAuth 2.0 authorization inside embedded WebViews, so the flow
// opens Google's consent page in a Chrome Custom Tab (a real browser surface)
// and the redirect page shows a code the user pastes back into the app. PKCE
// binds the pasted code to this session. The client id/secret identify the
// Antigravity "installed app" client (the secret is not confidential for
// installed apps and is shipped by the public CLI); they are injected at build
// time from a local, gitignored .env so they are never committed.
export function antigravityClientId(): string {
  return process.env.EXPO_PUBLIC_ANTIGRAVITY_CLIENT_ID ?? '';
}
export function antigravityClientSecret(): string {
  return process.env.EXPO_PUBLIC_ANTIGRAVITY_CLIENT_SECRET ?? '';
}
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
    client_id: antigravityClientId(),
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

/** Reads one query parameter from a URL or a bare "a=1&b=2" query string. */
function queryParam(url: string, name: string): string | null {
  const queryIndex = url.indexOf('?');
  let query = queryIndex >= 0 ? url.slice(queryIndex + 1) : url;
  const hashIndex = query.indexOf('#');
  if (hashIndex >= 0) query = query.slice(0, hashIndex);
  if (!query.includes('=')) return null;
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

/**
 * Accepts whatever the user pasted after signing in: a bare authorization code,
 * a full redirect URL, or just the `code=…&state=…` query fragment.
 */
export function extractAuthCode(input: string): string | null {
  const value = input.trim();
  if (value === '') return null;
  if (value.includes('code=')) {
    const code = queryParam(value, 'code');
    return code !== null && code !== '' ? code : null;
  }
  if (value.includes('error=')) return null;
  // A bare authorization code (Google codes use URL-safe characters).
  return /^[A-Za-z0-9._~+/=-]+$/.test(value) ? value : null;
}

export function tokenExchangeBody(input: {
  code: string;
  verifier: string;
}): string {
  const secret = antigravityClientSecret();
  return encodeForm({
    client_id: antigravityClientId(),
    ...(secret ? { client_secret: secret } : {}),
    code: input.code,
    code_verifier: input.verifier,
    grant_type: 'authorization_code',
    redirect_uri: ANTIGRAVITY_REDIRECT_URI,
  });
}

export function tokenRefreshBody(refreshToken: string): string {
  const secret = antigravityClientSecret();
  return encodeForm({
    client_id: antigravityClientId(),
    ...(secret ? { client_secret: secret } : {}),
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
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
