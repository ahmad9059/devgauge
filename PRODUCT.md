# DevGauge Product

<!-- uizze:product-schema 1 -->

## Platform

android

## Stack

The client is an Expo SDK 57 application using React Native 0.86, React 19, TypeScript, and Expo Router — Android only. The production system is open source and runs on a Hetzner VPS (2 vCPU / 4 GB, owned) for the API and connector workers, with Neon Postgres, Upstash Redis, and Cloudflare R2 as managed services. Distribution is Google Play and F-Droid (no iOS). The live domain is `devgauge.devshub.xyz`, with an own domain planned later.

## Users

Primary users are individual software developers who actively use two or more AI coding subscriptions and need to know which allowance is available before choosing a tool. They check DevGauge during a work session, often briefly and one-handed, to answer: what can I use now, what is close to a limit, and when will it reset?

The first release is optimized for individuals. Shared team workspaces, administrator views, and organization billing are open future decisions rather than assumed V1 capabilities.

## Product Purpose

DevGauge connects OpenAI Codex, Claude Code, OpenCode Go, and GitHub Copilot, normalizes their different quota models, and presents current allowance, consumption, reset timing, freshness, history, and actionable threshold alerts in one trusted mobile experience.

Success means a user can connect a provider safely, understand its usable capacity in seconds, distinguish live from stale data, and receive a useful warning before an allowance becomes unavailable.

## Positioning

DevGauge is a quota decision instrument, not another generic analytics dashboard. Its differentiator is an honest, provider-aware view that preserves dynamic quota windows and data provenance instead of pretending all providers expose the same metrics.

## Operating Context

- The Android app is the daily monitoring surface; no iOS support.
- Provider refreshes run on a Hetzner VPS so history and notifications work while the app is closed.
- Codex and Copilot run server-side in the connector worker on the VPS.
- Claude Code usage is synchronized from a desktop companion without exporting Claude subscription OAuth credentials; this is the only on-device companion.
- Connection setup may hand off to a browser, a device-code page, an API-key form, or the desktop companion depending on the provider.
- Notifications are local-first (WorkManager) with optional UnifiedPush/ntfy, because F-Droid builds have no Google Play Services.

## Capabilities And Constraints

- Connect and disconnect all four providers: OpenAI Codex, Claude Code, OpenCode Go, and GitHub Copilot.
- Preserve provider-specific and unknown quota buckets in a shared normalized model.
- Display used and remaining allowance, reset times, plan and source metadata when available, connection health, fetched time, and stale state.
- Retain historical snapshots for trends and notification evaluation.
- Support provider-specific metrics only when the provider actually exposes them; unavailable exact spend, token, identity, or model data must never be fabricated.
- Never collect account passwords or export Claude Code OAuth credentials.
- Treat provider contracts as versioned, fallible external dependencies behind validated adapters.
- The V1 product is read-only with respect to provider quotas, except for Codex rate-limit reset-credit consumption, which ships in V1 behind explicit user confirmation, an idempotency key, a post-consume refresh, and a dedicated audit event. Other mutating actions remain excluded until a later, explicitly confirmed release.

## Brand Commitments

- Product name: DevGauge.
- Open source, Android-only, distributed on Google Play and F-Droid.
- Live domain `devgauge.devshub.xyz`; own domain planned later.
- The experience is dark-first and black-led, with selectable System, Dark, and Light appearances and with the visual restraint and precision associated with Epic Games and Vercel interfaces.
- The supplied mobile references establish a preference for oversized white data hierarchy, immersive full-width sections, quiet near-black controls, restrained separators, modern line graphs, generous touch targets, and sparse use of high-chroma status color.
- Usage presents Claude Code, Codex, OpenCode Go, and GitHub Copilot as stacked provider sections. Connectors mirrors that structure for provider connection status and actions. Settings owns appearance, app text sizing, notifications, privacy, legal, and support.
- The product must not resemble a template dashboard, a neon cyberpunk control panel, or a grid of interchangeable metric cards.

## Evidence On Hand

- `docs/ai-coding-usage-provider-api-guide.md` documents the verified provider connection paths, normalized usage model, refresh guidance, known omissions, and security requirements.
- `src/app/index.tsx` and `src/app/_layout.tsx` are starter placeholders and provide no incumbent product workflow or visual system to preserve.
- The user supplied a rough three-screen wireframe and an Epic Games-style mobile concept as directional evidence. They are conversation attachments rather than repository assets; their durable structural interpretation is recorded in `docs/plans/devgauge-production-app/UI-UX-SCREEN-CONTRACT.md`. No final logo, production brand asset set, customer claims, pricing, or user research artifacts are present and none may be invented.

## Product Principles

- Capacity before analytics: answer what is usable now before showing history.
- Honest data: expose freshness, provenance, unknown values, and provider limitations.
- Calm under pressure: make warning and limited states unmistakable without turning the product into an alarm board.
- Provider-native connection, unified monitoring: setup respects each provider while daily scanning feels consistent.
- Privacy is visible product behavior, not hidden policy text.

## Accessibility And Inclusion

The mobile experience must meet WCAG 2.2 AA-equivalent outcomes where applicable, preserve Android platform navigation and assistive-technology behavior, support font scaling and reduced motion, avoid color-only status meaning, and meet Android touch-target guidance.
