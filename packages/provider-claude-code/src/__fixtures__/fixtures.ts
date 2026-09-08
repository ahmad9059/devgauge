/** A realistic Claude Code statusLine object including sensitive fields that MUST be dropped. */
export const rawStatusLineFixture = (): Record<string, unknown> => ({
  version: "2.1.260",
  session_id: "sess_abc123",
  transcript_path: "/home/user/.claude/projects/-Users-user-proj/sess_abc123.jsonl",
  cwd: "/home/user/projects/myapp",
  git_branch: "feature/login",
  repository: "github.com/octocat/myapp",
  model: "claude-sonnet-4-5",
  hook_metadata: { enabled: true },
  is_cancelled: false,
  num_turns: 12,
  duration_ms: 540000,
  total_cost_usd: 0.42,
  account: { email: "user@example.com", oauth_token_present: true },
  rate_limits: {
    five_hour: { used_percentage: 23.5, resets_at: 1788600000 },
    seven_day: { used_percentage: 41.2, resets_at: 1789000000 },
    spend_limit: { used_percentage: 10, resets_at: 1789600000 },
  },
});

export const minimalStatusLineFixture = (): Record<string, unknown> => ({
  version: "2.1.260",
  rate_limits: {
    five_hour: { used_percentage: 23.5, resets_at: 1788600000 },
    seven_day: { used_percentage: 41.2, resets_at: 1789000000 },
  },
});