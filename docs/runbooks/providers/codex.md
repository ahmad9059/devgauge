# Runbook - OpenAI Codex App Server

## Runtime contract

- Pinned release: `codex-cli 0.153.4`.
- Production Linux x86-64 musl SHA-256: `56ef98ab4032d317ab26e9b5e5a175650717351edb16ed9cde0cb6d1734d62da`.
- Transport: private JSONL `stdio` only (`codex app-server --listen stdio://`). Never enable a public WebSocket listener or call internal ChatGPT endpoints.
- Schema gate: `pnpm --filter @devgauge/provider-codex schema:check` regenerates 1,010 TypeScript/JSON Schema files and verifies aggregate SHA-256 `eceec59c97b0c6b036095fa062df9c417a90d0d7bffa47d4a41ec064716c8bcf`.

The worker creates a mode-0700 directory per job, passes only an allowlisted environment, sets isolated `HOME`, `CODEX_HOME`, and `TMPDIR`, and terminates the process group on timeout or protocol failure. Profile files are archived only after shutdown, envelope-encrypted, uploaded to private S3/R2 storage, and removed from local plaintext storage in `finally`.

## Required configuration

```text
DATABASE_URL
REDIS_URL
ENC_MASTER_KEY
S3_ENDPOINT
S3_REGION
S3_BUCKET
S3_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY
CODEX_BINARY_PATH=/usr/local/bin/codex
CODEX_LOGIN_TIMEOUT_MS=900000
KILLSWITCH_PROVIDER_CODEX=false
FLAG_PROVIDER_MUTATION_CODEX_RESET_CREDIT=false
```

The worker must have no public listener. Keep the R2 bucket private and deny App Server child processes access to database, Redis, object-storage, or encryption credentials.

## Device login

1. Mobile calls `POST /v1/connections/codex/device-login`.
2. Poll `GET /v1/connections/codex/device-login/:attemptId` until `code_ready`, then display the returned verification URL and one-time user code.
3. Completion is driven by `account/login/completed`; `account/updated` supplies plan metadata.
4. Cancel with `POST /v1/connections/codex/device-login/:attemptId/cancel`.

Attempt IDs are owner-scoped and resumable. User codes are encrypted at rest and cleared at terminal status. The App Server profile is never returned to the API or mobile app.

## Refresh behavior

- Foreground reads enqueue at most one refresh per five-minute bucket.
- Connected accounts receive a 15-minute BullMQ scheduler.
- `account/rateLimits/read` is authoritative. Every non-null dynamic window is persisted.
- `account/usage/read` is optional and isolated: an activity failure cannot discard valid quota data.
- The kill switch stops new launches while cached snapshots remain readable.

## Reset credits

Reset mutation fails closed unless `FLAG_PROVIDER_MUTATION_CODEX_RESET_CREDIT=true`, the provider kill switch is off, and the latest validated snapshot reports an available earned credit. The API requires explicit confirmation, enforces three attempts per user per hour, and persists a UUID idempotency key.

The worker maps `reset`, `alreadyRedeemed`, `nothingToReset`, and `noCredit` separately. Every outcome is followed by a required validated rate-limit read before the attempt becomes complete. Failures retain the previous latest snapshot.

## Failure recovery

| Symptom | Action |
|---|---|
| Binary version/checksum mismatch | Keep kill switch on; rebuild from the pinned artifact and run schema/canary gates |
| `contract_drift` | Preserve cached usage, compare generated schema hash, replay fixtures, then stage an upgrade |
| Login expired/denied | Start a new attempt; do not reuse the device code |
| Profile digest mismatch | Quarantine the object, mark reauthentication required, and do not launch App Server |
| Connection busy | Retry with jitter; all profile-mutating jobs share one connection lock |
| Activity read fails | Keep the valid quota snapshot; investigate independently |
| Reset job fails | Keep last-known-good usage and retry the same idempotency key only |

## Verification

```bash
pnpm --filter @devgauge/provider-codex test
pnpm --filter @devgauge/provider-codex schema:check
pnpm --filter @devgauge/connector-worker test
pnpm --filter @devgauge/api test
```

An unauthenticated process canary must return `account: null` and `requiresOpenaiAuth: true` from `account/read`. Before beta or any binary upgrade, run a controlled staging canary with a dedicated approved ChatGPT account covering login, `account/read`, `account/rateLimits/read`, and `account/usage/read`. That authenticated canary cannot be completed in CI and remains a release gate.
