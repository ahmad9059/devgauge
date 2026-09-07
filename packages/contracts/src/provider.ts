import { z } from "zod";

/**
 * Provider identifiers used across every layer of the product.
 * The order here is not the display order (see PROVIDER_DISPLAY_ORDER).
 */
export const PROVIDER_IDS = ["codex", "claude-code", "opencode-go", "github-copilot"] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

export const providerIdSchema = z.enum(PROVIDER_IDS);

/**
 * Fixed provider display order for the Usage and Connectors screens,
 * matching the approved UI/UX screen contract.
 */
export const PROVIDER_DISPLAY_ORDER: readonly ProviderId[] = [
  "claude-code",
  "codex",
  "opencode-go",
  "github-copilot",
];