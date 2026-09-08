/**
 * Ambient declaration for the optional, lazily-loaded Copilot SDK runtime.
 * The SDK is NOT a build dependency; it is pinned and installed in the worker
 * image at Phase 10 (or when a real seat is provisioned). This declaration lets
 * TypeScript typecheck the dynamic import path without the package present.
 */
declare module "@github/copilot-sdk" {
  export interface CopilotClientOptions {
    gitHubToken: string;
    useLoggedInUser?: boolean;
  }
  export class CopilotClient {
    constructor(options: CopilotClientOptions);
    rpc: {
      account: {
        getQuota(_: Record<string, never>): Promise<{ quotaSnapshots: Record<string, unknown> }>;
      };
    };
  }
}