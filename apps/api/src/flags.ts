import type { ProviderId } from "@devgauge/contracts";

import type { ApiEnv } from "./env.js";

export interface FeatureFlags {
  /** Enables the developer-only mock transport. Production builds must reject it. */
  mockTransport: boolean;
  /** Enables Codex reset-credit consumption (V1 mutation, behind confirmation). */
  codexResetCreditMutation: boolean;
  /** Remote kill switches that disable a provider's refresh jobs. */
  killSwitches: Record<ProviderId, boolean>;
}

export const getFeatureFlags = (env: ApiEnv): FeatureFlags => ({
  mockTransport: env.FEATURE_MOCK_TRANSPORT === "true",
  codexResetCreditMutation: env.FLAG_PROVIDER_MUTATION_CODEX_RESET_CREDIT === "true",
  killSwitches: {
    codex: env.KILLSWITCH_PROVIDER_CODEX === "true",
    "claude-code": env.KILLSWITCH_PROVIDER_CLAUDE_CODE === "true",
    "opencode-go": env.KILLSWITCH_PROVIDER_OPENCODE_GO === "true",
    "github-copilot": env.KILLSWITCH_PROVIDER_GITHUB_COPILOT === "true",
  },
});