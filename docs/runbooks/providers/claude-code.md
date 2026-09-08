# Runbook — Claude Code Companion

## What it is

The **only on-device companion**. Claude Code runs on the user's laptop and, via
its `statusLine`, feeds a local `devgauge-companion` command. The companion
minimizes the statusLine JSON to only recognized `rate_limits`, queues it
encrypted, and syncs it to the DevGauge API. Codex/Copilot run server-side.

## Commands

- `devgauge-companion pair --code <code>` — exchange a single-use code (from the
  mobile app) for a revocable device credential. Fails closed without an allowed
  credential store.
- `devgauge-companion ingest` — read one bounded statusLine JSON from stdin,
  minimize it, queue it, and best-effort sync (never blocks Claude Code).
- `devgauge-companion sync` — flush the offline queue.
- `devgauge-companion status` / `doctor` / `uninstall`.

## Data minimization (non-negotiable)

- Only `rate_limits.five_hour`, `rate_limits.seven_day`, `rate_limits.spend_limit`,
  `capturedAt`, `deviceId`, and `claudeCodeVersion` ever leave the machine.
- The companion never reads credential files, and never calls the undocumented
  `api.anthropic.com/api/oauth/usage` endpoint. Source paths, transcripts, prompt
  IDs, repository identity, cwd, model, cost, and OAuth material are dropped and
  covered by leak tests (`packages/provider-claude-code`).

## Pairing / device security

- Code: 8 hex chars, hashed at rest, single-use, 10-minute TTL.
- Device credential: random 256-bit secret, stored hashed server-side;
  sync auth is `X-Device-Id` + `Authorization: Bearer <secret>`.
- Queue at rest is encrypted with a local key held next to the credential.
- File credential store is 0600 and only allowed with
  `DEVGAUGE_ALLOW_FILE_CREDENTIALS=1` (fail-closed otherwise).

## Failure modes

| Symptom | Meaning | Action |
|---|---|---|
| `pair` rejected | Code wrong/expired/used | Generate a new code in the mobile app |
| Sync 401 | Device revoked or key lost | Re-pair from mobile |
| Offline | No network | Snapshot stays encrypted in the queue; retry with backoff |
| `doctor` shows issues | Keyring/permissions/config | Fix per message; never weaken storage silently |

## Verification

- Minimize/leak + queue/coalesce tests: `pnpm --filter @devgauge/provider-claude-code test`
  and `pnpm --filter @devgauge/claude-companion test`.
- Real-DB flow: `DATABASE_URL=... pnpm --filter @devgauge/api test` (pair, ingest,
  single-use code, revoke).
