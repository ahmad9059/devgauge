# Phase 1 Feasibility Evidence — Android

> Status: **Partially verified, not complete.** Research and a development-only WebView test harness exist; no signed-in provider account was tested. No provider connector is enabled by this document.
>
> Checked: 2026-09-25. Recheck primary sources and actual provider behavior when a test device and dedicated accounts are available.

## Execution boundary

- Repository: original current-state evidence `README.md:1` at validation start. The Expo foundation is being created in Phase 2; this report records research and a disposable in-app diagnostic, not production login code.
- Android-only: a Pixel 8 API 35 AVD now boots headless with KVM, and the internal preview APK installs and launches on it. This proves the app shell renders but does **not** substitute for signed-in provider testing, which needs real accounts and stays **not tested**.
- Test harness: `app/diagnostics/web-session.tsx` loads only declared HTTPS provider/identity hosts from `src/config/web-session-spike.ts`, shows host and status only, blocks unknown navigation, and does not inject JavaScript, inspect typed credentials or export cookie values. It is accessible in development or the explicit internal preview test APK; production redirects to Settings. This tests whether a local website session can work, not whether third-party permission has been granted.

## Evidence and outcomes

| Provider | Primary evidence | Android signed-in result | Release decision |
|---|---|---|---|
| Claude | [Official usage guide](https://support.claude.com/en/articles/9797557-usage-limit-best-practices) links to `claude.ai/settings/usage` and describes five-hour/weekly indicators. [AI Usage privacy policy](https://usage-4e75d.web.app/privacy-policy.html) claims locally processed WebView sessions for Claude. | **Not tested** (no test account/device session) | Live sync disabled until signed-in flow, session persistence, usage access, policy and logout are verified. |
| Codex | [OpenAI Codex auth](https://developers.openai.com/codex/auth) describes first-party login; [usage page](https://chatgpt.com/codex/settings/usage) belongs to ChatGPT. Comparator lists Codex but does not disclose its method. | **Not tested** | Live sync disabled until same gate passes. No forced quota reset inferred. |
| GitHub Copilot | [GitHub App auth](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-with-a-github-app-on-behalf-of-a-user) and [billing endpoints](https://docs.github.com/en/rest/billing/usage) document an API-token path, separate from the required website session. Comparator policy claims a local GitHub WebView session. | **Not tested**; GitHub App billing permission spike also pending test app | Live sync disabled until website-session gate passes or owner explicitly chooses the OAuth alternative. |
| Command Code | `API.md` §3.3 distinguishes product-level pricing docs from unverified `/alpha/*` routes. | No network contract test | Experimental and off until vendor contract. |
| OpenCode Go | [Official Go page](https://opencode.ai/docs/go/) describes limit rules and API key setup; `API.md` §3.4 marks candidate current-usage route unverified. | No network contract test | Experimental and off until vendor contract. |
| Gemini CLI | [Official quotas](https://geminicli.com/docs/resources/quota-and-pricing/) and [`/stats model`](https://geminicli.com/docs/reference/commands/#stats) expose session/model stats and quota information in the CLI. [CLI auth documentation](https://geminicli.com/docs/get-started/authentication/) distinguishes Google sign-in and API-key modes. | No documented third-party account-wide quota scope/endpoint found; no Google test client registered | Live Android quota sync **unverified**. Explore DevGauge-owned OAuth authorization and an approved quota API; otherwise only explicit user-shared, sanitized session stats. Do not reuse CLI OAuth client or tokens. |

## Android WebView verification matrix (all pending)

For each of Claude, Codex and GitHub Copilot, use a **dedicated test account** on a real Android device or AVD. Record Android version, WebView version, app build hash, account tier (without identifier), tested date, first-party usage source, and sanitized pass/fail evidence. Do not commit screenshots containing emails, tokens or cookies.

- [ ] Official login page opens, including redirect hosts/MFA/passkey where applicable; append only verified identity domains to the host allowlist.
- [ ] Usage surface shows test account's provider-native limits and reset semantics; no page visit alone counts as connected.
- [ ] Closing/reopening app retains only the expected local session; expiry prompts reauthentication without stale data being labeled live.
- [ ] Reload and account switching do not mix identities; cookie-store scoping and deletion do not disrupt another provider.
- [ ] Logout/delete clears applicable website state and local metadata; Android restore behavior is verified.
- [ ] Provider terms, Play disclosures, read-only data access, navigation allowlist and third-party-cookie requirements reviewed by the release owner.

If any row fails, keep that provider's automatic connection disabled. An OAuth-token fallback or manual companion is not fulfillment of the owner's embedded-session requirement without an explicit product decision.

## Open decisions

1. Production Android package and callback domain explicitly deferred by the owner; legal/privacy owner and Google Play release owner remain to be assigned.
2. **Assigned to product owner:** run signed-in Android checks using their own test accounts on their device with the development APK; share redacted outcomes only, never passwords, session cookies or screenshots with identifiers. Agent supplies the build and checklist.
3. Whether OAuth/manual fallback is acceptable for providers failing their WebView gate.
4. Vendor confirmation for experimental provider usage contracts and Gemini CLI account-level quota integration.
5. SQLCipher measurements and choice in Phase 4; consent/telemetry policy remains separate.
