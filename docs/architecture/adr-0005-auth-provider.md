# ADR-0005: Authentication Provider (Open-Source / Self-Hosted)

Status: Proposed (final vendor selected in Phase 4)

## Context
Android-only sign-in must support Google and email magic link with minimal client-side credential handling, stay open-source friendly (no proprietary vendor lock-in), and match the launch jurisdictions (ADR-0010).

## Decision
- Use **Better Auth** (open source, self-hosted) as the default, or **Neon Auth** (managed Better Auth) if self-hosting is unwanted — both are OSS-based and Android-compatible.
- Authorization Code + PKCE with verified app links (Android App Links / universal links).
- The API validates tokens and owns authorization; a request body/header user ID is never trusted.
- Android Keystore (via expo-secure-store) holds only the app session/refresh material and locally generated encryption keys — never provider credentials.
- OAuth `state`/`nonce` are single-use, short-lived, and user-bound; the GitHub OAuth flow additionally binds a requesting user (Phase 6).
- Apple sign-in is **not** included (no iOS support).

## Consequences
- No proprietary auth vendor or per-user licensing cost.
- Least-privilege scopes must be documented in each connect flow's privacy step.
- Data-processing location of the chosen auth backend must match the launch jurisdictions before final selection.