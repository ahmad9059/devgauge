# DevGauge Data Inventory

> Phase 9 inventory of user data collected, processed, retained, and exported by
> the DevGauge control plane. This document is the source of truth for the
> privacy/export/delete UI and for store declarations.

## Normalized usage (core)

| Item | Stored where | Purpose | Retention |
|---|---|---|---|
| User identity (email, locale, timezone) | `users` | Account, formatting | Until account deletion |
| Provider connection state, plan, adapter version, last error category | `provider_connections` | Connection health | Until disconnect or account deletion |
| Encrypted provider credentials / OAuth tokens / device codes | `credential_envelopes`, encrypted | Fetching usage | Never exported; deleted on disconnect/account deletion |
| Normalized usage snapshots (plan, windows, reset times, source, fetched time) | `usage_snapshots`, `usage_windows` | Current view + history | 90 days raw; daily rollups to 13 months; then deleted |
| Codex daily token activity | `usage_activity_daily` | Provider-specific metrics | 13 months |
| Codex reset credits + earned reset activity | `codex_usage` metadata + `codex_reset_credit_attempts` | Reset-credit workflow | Tied to provider connection/account deletion |
| Claude companion devices | `companion_devices` | Pairing/sync | Until revoke or account deletion |
| Encrypted Claude status-line snapshots | (minimized) | Companion sync | Same as usage snapshots |

## Alerts and preferences

| Item | Stored where | Purpose | Retention |
|---|---|---|---|
| Alert rules (provider/window/kind/threshold/hysteresis/quiet hours/preview) | `alert_rules` | Server-side evaluation | Until rule deleted or account deletion |
| Alert rule evaluation state | `alert_rule_state` | Hysteresis + reset-cycle dedupe | Until account deletion |
| Alert events (title/body are generic, non-account templates) | `alert_events` | In-app delivery history | Until account deletion |
| User preferences (theme, text scale, analytics opt-out, notification preview) | `user_preferences` (server) + device AsyncStorage | Localization/UX | Until account deletion or clear |

## Never collected / never exported

- Passwords for any provider or DevGauge.
- Claude Code OAuth credentials, prompt/source/repository content, or file paths.
- Full upstream provider payloads or error bodies.
- API keys/tokens/device codes/companion secrets in exports, logs, analytics, or crash reports.
- Content of Codex ChatGPT sessions beyond quota/activity.

## Export

`GET /v1/data/export` returns only normalized usage (provider, window, used/remaining,
timestamps, source) as JSON or CSV. Credentials, encrypted envelopes, token hashes,
plan/account identifiers beyond the provider name, and error bodies are excluded by
allowlisted serializers.

## Deletion

- `DELETE /v1/data/history` removes raw snapshots/windows/activity for a provider or all
  providers while preserving connections, alert rules, and preferences.
- `DELETE /v1/me` revokes sessions, tombstones the user pseudonymously, removes Codex
  object-storage profiles before the database cascade, then hard-deletes user-owned rows.
- An append-only pseudonymous deletion ledger outside normal backup restore keeps a
  30-day record that deletion was requested; `isTombstoned` ignores expired rows.
