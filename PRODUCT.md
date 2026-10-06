# DevGauge

<!-- uizze:product-schema 1 -->

## Platform

android

## Users

Developers who use multiple coding agents and need to compare their usage quotas and reset windows.

## Product Purpose

Provide one local-first Android dashboard for provider usage, reset information, connections, and local alerts.

## Capabilities and Constraints

DevGauge supports Claude, Codex, Command Code, OpenCode Go, GitHub Copilot, and Antigravity. Website integrations use persistent in-app sessions; Antigravity uses Google OAuth. Usage windows depend on provider responses and account plans. Background work has a six-hour minimum interval and is subject to Android scheduling.

Release artifacts are ARM64-only. Data is stored locally with SQLCipher and SecureStore. Marketing screenshots must show the actual application and label illustrative account data.

## Brand Commitments

Preserve DevGauge's supplied gauge logo, established monochrome identity, Geist typography, and restrained interface. Marketing assets use black and off-white, clear copy, and real screen captures rather than invented UI.

## Evidence on Hand

The application is runnable on a connected ARM64 Android phone. Source screens live in `app/`, shared components in `src/components/`, and branding in `assets/`. Marketing demonstrates sample usage, not customer accounts, testimonials, or measured performance claims.

## Product Principles

- Show quota used and preserve unknown values honestly.
- Keep user history and credentials local.
- Preserve the last successful snapshot after refresh failure.
- Demonstrate actual application behavior in promotional material.
