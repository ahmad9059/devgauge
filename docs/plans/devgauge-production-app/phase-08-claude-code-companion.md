# Phase 8 - Ship Claude Code Companion

Depends on: Phase 4 companion-device primitives; Phase 3 pairing UX

---

## 1. Goal

Deliver a trustworthy cross-platform desktop companion that receives Claude Code's official local `statusLine` JSON, reconstructs a strict minimized payload, pairs with the user's DevGauge account, queues snapshots offline, and syncs them without ever reading or exporting Claude OAuth credentials, prompts, transcripts, file paths, or repository identity.

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

- `apps/claude-companion/src/commands/pair.ts` (new)
- `apps/claude-companion/src/commands/ingest.ts` (new)
- `apps/claude-companion/src/commands/install.ts` (new)
- `apps/claude-companion/src/commands/uninstall.ts` (new)
- `apps/claude-companion/src/commands/status.ts` (new)
- `apps/claude-companion/src/commands/doctor.ts` (new)
- `apps/claude-companion/src/minimize.ts` (new)
- `apps/claude-companion/src/queue.ts` (new)
- `apps/claude-companion/src/credential-store.ts` (new)
- `apps/claude-companion/src/__fixtures__/**` (new)
- `packages/provider-claude-code/src/schema.ts` (new)
- `packages/provider-claude-code/src/normalize.ts` (new)
- `apps/api/src/routes/connections/claude-code.ts` (new)
- `apps/api/src/routes/companion-snapshots.ts` (new)
- `apps/mobile/app/connect/claude-code/**` (new)
- `apps/mobile/src/features/providers/claude-code/**` (new)
- `docs/runbooks/providers/claude-code.md` (new)
- `docs/privacy/claude-companion-data-map.md` (new)
- `.github/workflows/release-companion.yml` (new)

## 5. Acceptance Criteria And QA Checklist

- [ ] Property-based/prohibited-field tests prove arbitrary statusLine input cannot leak outside the allowlisted minimized object.
- [ ] Source paths, transcript paths, prompt/session IDs, repository metadata, email, authorization, OAuth, and tokens never reach network, queue, logs, telemetry, or errors.
- [ ] Ingest adds negligible status-line latency and never blocks Claude Code on network failure.
- [ ] Offline queue coalesces, caps, retries, survives restart, and syncs idempotently after reconnection.
- [ ] Pairing code is short-lived/single-use, cannot pair to the wrong account silently, and supports immediate device revocation.
- [ ] Install previews changes, makes an atomic backup, preserves unrelated settings, and uninstall removes only DevGauge-owned configuration.
- [ ] Five-hour, seven-day, absent, expired, and optional spend-limit windows render accurately with captured/synced freshness.
- [ ] Companion-offline UI explains the dependency and preserves last-known-good values.
- [ ] Package install/status/doctor/uninstall pass on every supported desktop OS and shell.
- [ ] The installed statusLine interval is 300 seconds, event-driven updates/heartbeat deduplicate correctly, and no server-side Claude polling exists.
- [ ] Credential and queue encryption, backup/device-transfer, uninstall, key loss, and unsupported-keyring behavior fail closed and recover clearly.
- [ ] Release artifacts are signed/checksummed, SBOM-listed, upgrade-tested, and rollback-tested.
- [ ] Direct Claude OAuth usage calls and credential-file access are absent from code and blocked by security tests.
- [ ] Privacy data map exactly matches captured and transmitted fields.

## 6. Open Questions

- Which desktop platforms and installation channels are mandatory for V1?
- May `install` modify Claude settings after showing a diff and receiving confirmation, or should it print manual instructions only?
- What stale threshold best reflects an inactive laptop without creating unnecessary alarms?
