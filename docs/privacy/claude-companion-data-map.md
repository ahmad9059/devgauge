# Claude Companion Data Map

What is **captured and transmitted** by the DevGauge Claude Code companion, and
what **never leaves the laptop**.

## Transmitted (only)

| Field | Example | Purpose |
|---|---|---|
| `schemaVersion` | `1` | Payload contract |
| `deviceId` | UUID | Pairs snapshot to the user/device |
| `capturedAt` | ISO-8601 | Freshness + clock-skew check |
| `localSequence` | monotonic int | Idempotent replay/ordering |
| `claudeCodeVersion` | `2.1.260` | Adapter compatibility |
| `rateLimits.five_hour.used_percentage` / `.resets_at` | number | Quota window |
| `rateLimits.seven_day.used_percentage` / `.resets_at` | number | Quota window |
| `rateLimits.spend_limit.used_percentage` / `.resets_at` (if present) | number | Spend window |

## Never read, stored, or transmitted

- Claude credential files and subscription OAuth tokens.
- Source code, file paths (`cwd`, transcript paths), repository identity/branch.
- Prompt/session IDs, model names, conversation content, message counts.
- Cost/token totals, email, or arbitrary statusLine metadata.
- Any field not on the allowlist above is dropped at the minimize boundary and
  covered by property/leak tests.

## At rest (on the laptop)

- Device credential + local queue key: OS keyring preferred; 0600 encrypted file
  only under `DEVGAUGE_ALLOW_FILE_CREDENTIALS=1` (fail-closed otherwise).
- Offline queue: AES-256-GCM encrypted, bounded (500 entries / 7 days).

## Server side

- `pairing_codes`: hashed single-use code, 10-min TTL.
- `companion_devices`: hashed device secret, last-seen, revocable.
- Snapshots persist as normalized `usage_snapshots` / `usage_windows`
  (`source = official-local`) — the same non-secret read model as all providers.

This map must match the payloads in `packages/provider-claude-code` and the
`/v1/companion/*` routes. If a field is added here, it must be added there and
vice-versa.
