# Secret Handling Policy

Applies to every repository, log, trace, fixture, error response, crash report,
push payload, and analytics event produced by DevGauge.

## Classified as sensitive (never persisted or logged in plaintext)

- Provider credentials: OpenCode Go API keys, GitHub tokens (`gho_`/`ghu_`/`github_pat_`),
  ChatGPT/Codex auth state, Claude companion device credentials.
- OAuth materials: authorization codes, `state`/`nonce`/PKCE verifiers, device codes,
  refresh tokens.
- Codex App Server profile directories and their plaintext contents.
- API secrets: `client_secret`, KMS data keys, database URLs, Redis URLs, storage keys.
- HTTP `Authorization` headers in any log or trace.

## Rules

1. Never write a real secret into code, tests, fixtures, `.env*` (except `.env.example`
   placeholders), commit messages, or issue/PR bodies.
2. `.env*` local files are gitignored; `.env.example` contains names only.
3. Loggers redact at serialization time (`LOG_REDACT_PATHS` in `@devgauge/config`).
4. Telemetry and crash reports must strip secret-shaped values before export.
5. Provider child processes receive a scrubbed environment (`SANDBOX_ENV_ALLOWLIST`)
   and never inherit API/database/Redis/KMS credentials.
6. CI runs gitleaks on every push/PR and fails on leaks.
7. If a real secret is detected in history or logs: rotate the secret immediately,
   remove/rotate the leaked material, open an incident, and record the rotation in
   the credential-rotation runbook.
8. Secret canaries (synthetic values) are used in tests to prove redaction works
   and that redaction is not disabled by future changes.

## Enforcement

- CI: `gitleaks` + `pnpm audit` (blocking high/critical).
- Tests: redaction unit tests in `packages/config` and sandbox probe tests in
  `apps/connector-worker`.
- Review: every PR must not add new `console.*` output that could carry a secret.