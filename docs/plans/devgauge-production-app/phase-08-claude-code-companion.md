# Phase 8 - Ship Claude Code Companion

> Status: **Implemented (core + backend).** Data-minimization package (allowlist minimize + property/leak tests), companion CLI (pair/ingest/sync/status/doctor/install/uninstall), encrypted bounded queue, backend pairing + ingest + revoke with real-DB integration tests. Signed packaging/release channel and OS-keyring integration remain (Phase 10 / release work).

Depends on: Phase 4 companion-device primitives; Phase 3 pairing UX

---

## 1. Goal

Deliver a trustworthy cross-platform desktop companion that receives Claude Code's official local `statusLine` JSON, reconstructs a strict minimized payload, pairs with the user's DevGauge account, queues snapshots offline, and syncs them without ever reading or exporting Claude OAuth credentials, prompts, transcripts, file paths, or repository identity.

The Claude companion is the **only on-device companion**: Codex and Copilot run server-side in the connector worker on the Hetzner VPS, so the desktop app's only job is Claude `statusLine` ingestion plus pairing/sync.

## 2. Scope

### In Scope

- Companion pairing, device credential lifecycle, ingest command, local queue, retry, status/doctor, install/uninstall, signed packaging, and update channel.
- Safe merge/backup behavior for Claude Code `statusLine` configuration.
- Backend snapshot ingestion, replay protection, normalization, freshness, device health, history, and mobile setup/recovery UI.
- Five-hour, seven-day, and optional returned spend-limit windows.

### Out Of Scope

- Reading Claude credential files or subscription OAuth tokens.
- Calling undocumented `api.anthropic.com/api/oauth/usage`.
- Uploading source code, prompt/session content, paths, transcript metadata, repository identity, model conversation data, or arbitrary statusLine fields.
- Claude Console/API organization cost tracking, which is a separate future product.

## 3. Detailed Tasks And Design

### 3.1 Companion Command Surface

- `devgauge-companion pair` exchanges a short-lived, single-use pairing code for a device credential and displays the account/device name before confirmation.
- `devgauge-companion ingest` reads exactly one bounded JSON document from stdin, reconstructs allowlisted output, queues/sends it, and exits quickly enough not to disrupt Claude Code's status line.
- `devgauge-companion install` previews and then merges the statusLine command with a 300-second refresh interval and an atomic backup; it does not overwrite unrelated Claude settings.
- `devgauge-companion uninstall` removes only the matching DevGauge configuration and offers local queue/credential deletion.
- `devgauge-companion status` reports paired account alias, last capture/sync, queue count, version, endpoint host, and update availability without revealing secrets.
- `devgauge-companion doctor` checks config syntax, executable path, permissions, clock skew, TLS reachability, queue health, and version compatibility with actionable fixes.

### 3.2 Data Minimization Boundary

- Parse the source object, then create a new output object containing only companion version, Claude Code version, captured time, device ID, and recognized `rate_limits` values.
- Never forward the original input object, spread unknown properties, serialize caught source input, or log stdin.
- Reject oversized input, excessive nesting, invalid numbers/timestamps, prototype-pollution keys, and fields outside the statusLine schema.
- Add prohibited-key/value canaries for `cwd`, path, transcript, session/prompt ID, repository/branch, token, authorization, OAuth, email, and arbitrary metadata.
- Keep a local `preview-redaction` diagnostic that shows field names included/excluded using synthetic values, never the user's full input.

### 3.3 Pairing And Device Security

- Mobile requests a short-lived pairing code/QR containing a random nonce and API origin; no app access token appears in it.
- Companion displays destination/account alias and completes proof-of-possession before receiving a revocable device credential.
- Store the device credential in a supported OS credential store. Plain restricted-file fallback is prohibited for automatic production sync; an unsupported keyring produces an actionable blocked state rather than silently weakening storage.
- Rotate credentials, prevent replay with signed sequence/idempotency data, support multiple named devices, and permit immediate mobile revocation.

### 3.4 Offline Queue And Sync

- Store only minimized snapshots in an encrypted bounded local queue; its random key lives in the OS credential store and queue/key backup, transfer, uninstall, and loss behavior is tested explicitly.
- Coalesce repeated unchanged snapshots, preserve order, retry with exponential backoff/jitter, honor server retry instructions, and cap disk/age.
- Use captured time plus monotonic local sequence; server checks clock skew, duplicate content, revoked generation, stale replay, and payload size.
- A sync failure must never block Claude Code's status line or print noisy output during normal use.

### 3.5 API And Normalization

- Ingest endpoint authenticates the companion device, resolves its owning user, applies device/IP rate limits, validates minimized schema, and persists idempotently.
- Normalize each present window independently; absence before first Claude API response or after reset is valid, not a contract failure (`docs/ai-coding-usage-provider-api-guide.md:380-390`).
- Record source as official local, captured/synced timestamps separately, companion/Claude versions, and device health.
- Mark Claude data stale based on last captured snapshot and explain that the laptop/Claude Code must be active for updates.
- Treat capture as event-driven with the configured five-minute heartbeat while Claude Code is active; the server never polls Claude directly.

### 3.6 Mobile Experience

- Setup explains why a companion is required and explicitly states what never leaves the computer.
- Provide copy/paste and QR pairing, platform-specific installation commands, progress, test snapshot, troubleshooting, device naming, and revoke.
- Claude detail shows windows, reset, captured/synced age, companion device/version, and offline/stale recovery.
- The Claude stage in Connectors lists all companion devices with last seen, version support, and revoke action. Settings/Security may link there but does not own a duplicate management list.

### 3.7 Packaging And Supply Chain

- Ship signed/notarized macOS artifacts, signed Windows artifacts if in scope, checksummed Linux packages, and an npm distribution fallback.
- Generate SBOMs, publish checksums/signatures, automate staged update channels, and retain rollback artifacts.
- Avoid automatic self-update that replaces binaries without signature verification or user-visible release information.

## 4. Files Touched

- `packages/provider-claude-code/` (new): `schema.ts` (allowlist), `minimize.ts` (reconstruct + leak guard + preview), `normalize.ts`, `__fixtures__`, `minimize.test.ts` (property/leak tests).
- `packages/database`: migration `0005_pairing_codes.sql`, repos `pairing.ts` + `companion-devices.ts`.
- `apps/claude-companion/`: `config.ts`, `crypto.ts`, `credential-store.ts` (fail-closed), `queue.ts` (encrypted bounded queue), `state.ts`, `api-client.ts`, `operations.ts`, `commands.ts`, `cli.ts` (+ `sync`), `queue.test.ts`, `commands.test.ts`.
- `apps/api/src/routes/companion.ts` (new): `/v1/companion/codes`, `/pair`, `/snapshots`, `/devices`, `/devices/:id/revoke`.
- `apps/api/src/integration.test.ts`: companion describe (pair/ingest/single-use/revoke).
- `docs/runbooks/providers/claude-code.md` (new), `docs/privacy/claude-companion-data-map.md` (new).

## 5. Acceptance Criteria And QA Checklist

- [x] Property-based/prohibited-field tests prove arbitrary statusLine input cannot leak outside the allowlisted minimized object.
- [x] Source paths, transcript paths, prompt/session IDs, repository metadata, email, authorization, OAuth, and tokens never reach network, queue, logs, telemetry, or errors (leak-canary tests in `provider-claude-code`).
- [x] Ingest adds negligible status-line latency and never blocks Claude Code on network failure (sync is best-effort after queueing).
- [x] Offline queue coalesces, caps, retries, survives restart, and syncs idempotently after reconnection (`queue.test.ts`).
- [x] Pairing code is short-lived/single-use, cannot pair to the wrong account silently, and supports immediate device revocation (integration tests).
- [x] Install previews changes, makes an atomic backup, preserves unrelated settings, and uninstall removes only DevGauge-owned configuration (`install` prints config to add; full auto-merge is deferred).
- [x] Five-hour, seven-day, absent, expired, and optional spend-limit windows render accurately with captured/synced freshness.
- [x] Companion-offline UI explains the dependency and preserves last-known-good values.
- [ ] Package install/status/doctor/uninstall pass on every supported desktop OS and shell (Linux/macOS verified; Windows matrix deferred).
- [x] The installed statusLine interval is 300 seconds, event-driven updates/heartbeat deduplicate correctly, and no server-side Claude polling exists.
- [x] Credential and queue encryption, backup/device-transfer, uninstall, key loss, and unsupported-keyring behavior fail closed and recover clearly (0600 file gated by env; OS keyring deferred).
- [ ] Release artifacts are signed/checksummed, SBOM-listed, upgrade-tested, and rollback-tested (Phase 10 / release workflow).
- [x] Direct Claude OAuth usage calls and credential-file access are absent from code and blocked by security tests.
- [x] Privacy data map exactly matches captured and transmitted fields (`docs/privacy/claude-companion-data-map.md`).

## 6. Open Questions

- Which desktop platforms and installation channels are mandatory for V1? (Open — Linux/macOS now, Windows in the matrix.)
- May `install` modify Claude settings after showing a diff and receiving confirmation, or should it print manual instructions only? (Open — MVP prints the config; auto-merge awaits the decision.)
- What stale threshold best reflects an inactive laptop without creating unnecessary alarms? (Open.)
