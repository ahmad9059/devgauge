# ADR 0004: GitHub Copilot auth flow, scope split, and broker decision

Status: accepted (Phase 6); connector stays release-disabled

Date: 2026-09-28

## Context

The product owner requested an embedded GitHub website session. The comparator's
privacy policy describes a local GitHub WebView connection, but that is not proof
of DevGauge's integration, provider permission, or stability. A GitHub App user
token is a separate, scoped-API fallback that must be proven against the billing
endpoints before it can be enabled. The Phase 1 Android website-session matrix for
GitHub is still pending on a real device.

## Decision

- **Primary fallback flow: GitHub App user-to-server device flow.** It needs only
  a client id, not a confidential client secret, so **no broker is required**
  (resolves the Phase 6 browser-PKCE-vs-device-flow and broker spike in favor of
  device flow for v1).
- **The embedded website-session path is not selected** until the Phase 1 Android
  matrix passes; `selectGitHubAuthMode()` returns `web-session` only when that
  gate is explicitly marked passed.
- **Billing scopes are never merged.** Personal (`/users/{owner}/…`) and
  organization (`/organizations/{owner}/…`) are separate connections with
  separate endpoints, external keys, and labels.
- **The connector remains release-disabled.** The GitHub descriptor keeps
  `capabilities.liveUsage = false`; the refresh engine records a
  `capability_disabled` attempt and makes **no network call**. Enablement waits on
  the real endpoint/permission spike.
- **Billing usage reports consumption, not an entitlement cap**, so normalized
  windows set `limit = null` (never zero or "unlimited").

## Consequences

- No broker service is deployed for v1, removing a secret-management and
  operations surface. If a future flow needs confidential exchange, API.md's
  minimal broker contract applies.
- The GitHub adapter, schemas, and normalization ship and are fully tested against
  sanitized fixtures, but cannot fetch live data until the gate passes.
- `remoteRevocation` is declared but not exercised, because no live token exists
  yet; disconnect always clears local credentials.
- Labels use GitHub terminology: "AI credits" and "Premium requests".

## Sources

- [GitHub App user authorization](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-with-a-github-app-on-behalf-of-a-user)
- [GitHub billing usage REST API](https://docs.github.com/en/rest/billing/usage)
- [GitHub OAuth device flow](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow)
