# Phase 6 — Add Claude and Codex Earned Reset Sections

Depends on: 3, 4; discovery may begin during 1

## 1. Goal

Expose real account reset offers and supported redemption independently of ordinary scheduled resets. Evidence: A22 and Phase 1 official provider sources.

## 2. Scope

In scope: tasks below. Other phase responsibilities and production publishing are outside this phase.

## 3. Detailed Tasks / Design

First produce RESET-CONTRACTS.md (new), separating provider-supported flow, current auth transport, eligibility, offered window, expiry and state-refresh contract. Codex App Server rateLimits/read provides availableCount and nullable credit detail; null is unknown, [] is known empty; authoritative count may exceed detail rows. consume requires one durable nonempty idempotencyKey per logical attempt, reused after uncertain retry; optional creditId is an opaque returned ID. Handle reset/alreadyRedeemed/nothingToReset/noCredit; re-read limits/credits afterward. Prove an Android-accessible authenticated transport: do not treat an app-server RPC as an arbitrary web endpoint or add a remote broker/desktop companion silently. Claude supports web/Desktop Reset for free and confirmation; no public third-party write endpoint verified. Explore supported authenticated first-party usage surface for user-driven redemption; keep native section showing eligibility/details/status and explicit confirmation. Do not auto-click undocumented controls or invent endpoints. If direct transport is unavailable, ship a clearly labeled first-party handoff and post-return sync, mark direct redemption blocked/partial. Add available/unknown/none/expired/confirming/applying/success/failure states; disabling repeated taps and recovering uncertain outcomes. Never infer new quotas locally or automatically spend resets.

### Separate commit slices

- `docs(resets): verify Claude and Codex redemption contracts`
- `feat(resets): model earned offers and detail sections`
- `feat(codex): redeem verified reset credits idempotently`
- `feat(claude): integrate supported confirmed reset flow`
- `fix(resets): reconcile uncertain redemption and refreshed limits`

## 4. Files Touched

app/provider/[providerId].tsx; app/session/[providerId].tsx (only if supported first-party flow verified); src/providers/types.ts; registry.ts; claude/adapter.ts; codex/adapter.ts; reset-contracts.ts (new); src/features/connections/provider-reset.ts (new); src/storage/repositories/ (forward state storage as needed)

## 5. Acceptance Criteria / QA Checklist

- [ ] Both detail pages distinguish earned offers from hourly/weekly countdowns and reminders.
- [ ] Confirmation names account/window and irreversible credit consumption; no automatic consumption.
- [ ] Double tap/restart/timeout never consume a second credit for the same attempt.
- [ ] Success follows verified provider outcome and fresh limits; failure preserves truthful data.
- [ ] A handoff is labeled as handoff; unsupported direct path explicitly remains incomplete.

## 6. Open Questions

External transport feasibility is the material uncertainty. Do not mark the original direct-redemption request complete on the strength of a browser link alone.
