# Phase 7 — Complete Provider Actions and Microinteractions

Depends on: 4, 5, 6 integration

## 1. Goal

Make visible controls functional and provide fast, accessible interaction feedback. Evidence: A21, A23; detail.tsx:100/198, sync-control.tsx:24, button.tsx:83.

## 2. Scope

In scope: tasks below. Other phase responsibilities and production publishing are outside this phase.

## 3. Detailed Tasks / Design

Wire detail Retry/Refresh to the selected connection coordinator; Reauthorize to correct provider login; Disconnect to persisted disconnect/vault cleanup and cancellation with clear confirmation of data/session effects. Establish provider-specific cookie cleanup feasibility; global Android WebView cookies may affect other accounts, so do not clear them indiscriminately. Disabled/unsupported actions must be clearly described instead of inert clickable rows. Finish settings and reset form errors/loading/success states. Consolidate production view-model types out of testing fixtures. Reconcile README/release docs and runtime capabilities with verified live transports without bypassing unproved gates. Preserve monochrome Geist design. Apply relevant UI skills during implementation, inspect existing screens before designing; use 120–240 ms press/expand/progress/fade transitions, immediate busy feedback, per-provider completion/error state and deliberate success announcement. Respect reduced motion everywhere including sync spinner, large text, TalkBack and minimum targets; avoid new animation dependencies unless justified. Ensure motion never delays writes/network completion.

### Separate commit slices

- `fix(provider): wire refresh retry and reauthorization`
- `fix(provider): implement scoped disconnect and schedule cleanup`
- `feat(ui): add accessible sync reset and progress feedback`
- `refactor(ui): separate production provider view types`
- `docs(app): reconcile actual capabilities and release status`

## 4. Files Touched

app/provider/[providerId].tsx; app/(tabs)/settings.tsx; src/components/usage/sync-control.tsx; provider-card.tsx; src/components/ui/button.tsx; progress-bar.tsx; src/design/motion.ts; src/features/dashboard/provider-views.ts; src/services/local-data.ts; README.md; docs/release/release-readiness.md

## 5. Acceptance Criteria / QA Checklist

- [ ] Every visible action succeeds or gives an explicit actionable disabled/error state.
- [ ] Press responds <=100 ms; no blocking acknowledgement delays; no layout jumps on success/error.
- [ ] Reduced motion disables nonessential loops/transitions, TalkBack announces results; large text does not clip.
- [ ] Disconnect cannot persist late sync data or cancel another provider notification/session.
- [ ] Light/dark phone/tablet states reviewed with actual final artifacts/screenshots.

## 6. Open Questions

Cookie partitioning/provider logout semantics require validation; preserve unrelated sessions.
