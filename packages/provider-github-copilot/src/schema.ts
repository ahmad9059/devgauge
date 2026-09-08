import { z } from "zod";

/**
 * Runtime quota snapshot returned by the Copilot SDK `account.getQuota` RPC.
 * `quotaSnapshots` keys are runtime strings and change — never allowlist them.
 */
export const copilotQuotaSchema = z.object({
  quotaSnapshots: z.record(
    z.string(),
    z
      .object({
        entitlementRequests: z.number().nullable(),
        usedRequests: z.number().nullable(),
        remainingPercentage: z.number().nullable(),
        resetDate: z.string().datetime({ offset: true }).nullable(),
      })
      .nullable()
      .optional()
  ),
});

export type CopilotQuota = z.infer<typeof copilotQuotaSchema>;

/** GitHub OAuth token-exchange response (JSON). */
export const githubTokenResponseSchema = z.object({
  access_token: z.string().optional(),
  token_type: z.string().optional(),
  scope: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
  expires_in: z.number().optional(),
  refresh_token: z.string().optional(),
  refresh_token_expires_in: z.number().optional(),
});

export type GithubTokenResponse = z.infer<typeof githubTokenResponseSchema>;

/** GitHub `/user` identity for account binding. */
export const githubUserSchema = z.object({
  id: z.number(),
  login: z.string(),
});

export type GithubUser = z.infer<typeof githubUserSchema>;