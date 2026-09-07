import type { ProviderId } from "@devgauge/contracts";
import { PROVIDER_DISPLAY_ORDER } from "@devgauge/contracts";

export const API_VERSION = "v1";

/** Minimum mobile client the API guarantees compatibility with (see ADR-0009). */
export const MIN_CLIENT_VERSION = "0.1.0";

/** Currently supported released client contracts for N/N-1 testing. */
export const SUPPORTED_CLIENT_VERSIONS: readonly string[] = ["0.1.0"];

export interface ProviderMetadata {
  name: string;
  sourceLabel: string;
  connectionMethod: string;
  /** Known humanized labels for provider-specific window IDs. Unknown IDs fall back to a humanized id. */
  knownWindowLabels: Record<string, string>;
}

export const providerMetadata: Record<ProviderId, ProviderMetadata> = {
  "claude-code": {
    name: "Claude Code",
    sourceLabel: "official-local",
    connectionMethod: "Desktop companion (statusLine)",
    knownWindowLabels: {
      five_hour: "5 hour",
      seven_day: "7 day",
    },
  },
  codex: {
    name: "OpenAI Codex",
    sourceLabel: "official-api",
    connectionMethod: "ChatGPT device-code login",
    knownWindowLabels: {},
  },
  "opencode-go": {
    name: "OpenCode Go",
    sourceLabel: "source-backed",
    connectionMethod: "API key",
    knownWindowLabels: {
      rolling: "5 hour",
      weekly: "Weekly",
      monthly: "Monthly",
    },
  },
  "github-copilot": {
    name: "GitHub Copilot",
    sourceLabel: "official-api",
    connectionMethod: "GitHub OAuth",
    knownWindowLabels: {
      premium_interactions: "Premium interactions",
    },
  },
};

/** Stable display order for Usage and Connectors (UI/UX screen contract). */
export const providerDisplayOrder = (): readonly ProviderId[] => PROVIDER_DISPLAY_ORDER;

export const getWindowLabel = (provider: ProviderId, windowId: string): string =>
  providerMetadata[provider]!.knownWindowLabels[windowId] ??
  windowId
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");