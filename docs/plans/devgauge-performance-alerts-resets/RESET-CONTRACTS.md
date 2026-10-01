# Earned reset contracts

Verified 2026-10-01. Direct Android redemption remains **partial**. No remote broker, desktop companion or undocumented mutation endpoint is authorized or implemented.

## Codex

`account/rateLimits/read` returns `rateLimitResetCredits`: null means unknown; `credits: null` means count-only; an empty detail array is known empty detail, while `availableCount` remains authoritative even if details are capped. Detail rows carry opaque IDs, status, reset type, grant/expiry instants and optional title/description. Redemption uses `account/rateLimitResetCredit/consume` with a durable UUID per logical attempt, reused after uncertainty, and optional returned `creditId`. Outcomes are `reset`, `alreadyRedeemed`, `nothingToReset`, or `noCredit`. Re-read limits afterward. These are app-server RPCs, not HTTP paths. Non-local WebSocket access needs authentication and TLS. [Official app-server documentation](https://learn.chatgpt.com/docs/app-server).

DevGauge currently captures first-party usage through Android WebView cookies (`session-config.ts`, `sync-provider.tsx`). It has no authenticated app-server client, pairing, server configuration, or account binding. Thus the documented RPC alone does not prove phone access. No eligible test account or authenticated Android-accessible app-server has been supplied. Direct consumption must stay disabled until an approved transport and native/account evidence exist. A browser usage link does not establish reset availability or successful redemption.

## Claude

Eligible accounts may receive an offer for a five-hour or weekly limit. Usage settings show expiry when applicable. Redemption is irreversible and uses a confirmation on Claude web/Desktop. It does not refund billed extra usage or change the credit balance; normal weekly timing remains. Mobile/Claude Code do not provide that reset control. [Official limit-reset help](https://support.claude.com/en/articles/17007452-what-is-a-limit-reset).

No public third-party write endpoint or eligible authenticated first-party offer has been verified here. DevGauge's WebView supports usage capture, but has no validated earned-offer schema or reset confirmation/result capture. An explicit browser handoff can let the user operate the first-party flow. Returning refreshes usage; it cannot claim redemption from navigation or infer a new quota locally.

## Required proof before enabling direct actions

- Account-bound authenticated transport usable by Android, and sanitized offer/result samples from an eligible account.
- Confirmation naming account and actual offered window; unknown fields remain unknown.
- Persisted attempt key before mutation; restart/timeout retries reuse that key.
- Double tap, uncertain retry, no-credit/no-window outcomes and fresh-limit reads proven on the actual transport.
- Claude confirmation and response semantics verified on the supported first-party surface without automatically clicking undocumented controls.

The native section must distinguish earned offers from ordinary reset timestamps and manual reminders. Current availability is unknown. Opening provider usage is a labeled handoff, never a successful reset.
