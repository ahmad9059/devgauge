# ADR-0005: Authentication Provider (Managed OIDC)

Status: Proposed (final vendor selected in Phase 4)

## Context
Mobile sign-in must support Apple, Google, and email magic link with minimal client-side credential handling. The provider choice affects region, subprocessor, and store-compliance obligations (ADR-0010).

## Decision
- Use a managed OIDC provider with Authorization Code + PKCE and verified app/universtal links.
- The API validates access tokens and owns authorization; a request body/header user ID is never trusted.
- SecureStore holds only the app session/refresh material and locally generated encryption keys — never provider credentials.
- OAuth `state`/`nonce` are single-use, short-lived, and user-bound; the GitHub OAuth flow additionally binds a requesting user (Phase 6).

## Consequences
- Least-privilege OIDC scopes must be documented in each connect flow's privacy step.
- Regional availability and data-processing location must match the launch jurisdictions before final selection.