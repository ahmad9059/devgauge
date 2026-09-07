import type { FastifyInstance } from "fastify";

import type { ProviderCapability } from "@devgauge/contracts";
import { providersResponseSchema } from "@devgauge/contracts";

const CAPABILITIES: ProviderCapability[] = [
  { provider: "claude-code", name: "Claude Code", connectionMethod: "Desktop companion", shipInV1: true, sourceLabel: "official-local" },
  { provider: "codex", name: "OpenAI Codex", connectionMethod: "ChatGPT device-code login", shipInV1: true, sourceLabel: "official-api" },
  { provider: "opencode-go", name: "OpenCode Go", connectionMethod: "API key", shipInV1: true, sourceLabel: "source-backed" },
  { provider: "github-copilot", name: "GitHub Copilot", connectionMethod: "GitHub OAuth", shipInV1: true, sourceLabel: "official-api" },
];

export const buildProvidersRoutes = (app: FastifyInstance): void => {
  app.get("/v1/providers", { preHandler: app.requireAuth }, async () =>
    providersResponseSchema.parse({ providers: CAPABILITIES })
  );
};