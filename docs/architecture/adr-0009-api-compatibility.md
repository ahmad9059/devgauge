# ADR-0009: API Compatibility Policy

Status: Accepted

## Context
App-store review delays mean old released clients must keep working while the API evolves. Provider contracts change faster than clients.

## Decision
- Public contracts are additive within a major version; clients ignore unknown fields and preserve unknown provider bucket IDs.
- The API supports the current and previous released mobile contract (`N` and `N-1`).
- Responses expose `minClientVersion`; forced upgrades are reserved for security or provider-contract emergencies and include an accessible blocking explanation.
- CI replays contract fixtures against the schemas bundled in every still-supported store release.

## Consequences
- Provider-specific window IDs are never hard-coded into clients (labels live in server-provided metadata).
- Contract drift in adapters preserves last-known-good data and continues bounded scheduled/canary retries with backoff.