# Software bill of materials notes

Container images are scanned in CI with Trivy. The Codex connector additionally pins the App Server artifact below and verifies its executable checksum before every process launch.

| Component | Version | Platform | SHA-256 |
|---|---:|---|---|
| `@openai/codex` / `codex-cli` | `0.153.4` | Linux x86-64 musl | `56ef98ab4032d317ab26e9b5e5a175650717351edb16ed9cde0cb6d1734d62da` |

The generated App Server TypeScript and JSON Schema aggregate hash is `eceec59c97b0c6b036095fa062df9c417a90d0d7bffa47d4a41ec064716c8bcf` across 1,010 files. `pnpm --filter @devgauge/provider-codex schema:check` regenerates and verifies this contract.
