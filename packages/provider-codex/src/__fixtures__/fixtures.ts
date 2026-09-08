/** Representative App Server response bodies from the provider guide. */

export const rateLimitsByLimitIdFixture = (): unknown => ({
  rateLimits: {
    limitId: "codex",
    limitName: null,
    planType: "plus",
    primary: { usedPercent: 25, windowDurationMins: 300, resetsAt: 1788600000 },
    secondary: { usedPercent: 40, windowDurationMins: 10080, resetsAt: 1789000000 },
    credits: null,
    rateLimitReachedType: null,
  },
  rateLimitsByLimitId: {
    codex: {
      limitId: "codex",
      limitName: null,
      planType: "plus",
      primary: { usedPercent: 25, windowDurationMins: 300, resetsAt: 1788600000 },
      secondary: { usedPercent: 40, windowDurationMins: 10080, resetsAt: 1789000000 },
      credits: null,
      rateLimitReachedType: null,
    },
  },
  rateLimitResetCredits: null,
});

export const usageReadFixture = (): unknown => ({
  summary: {
    lifetimeTokens: 1234567,
    peakDailyTokens: 45678,
    longestRunningTurnSec: 540,
    currentStreakDays: 8,
    longestStreakDays: 14,
  },
  dailyUsageBuckets: [{ startDate: "2026-06-18", tokens: 12345 }],
});

export const deviceCodeLoginFixture = (): unknown => ({
  type: "chatgptDeviceCode",
  loginId: "login-uuid-1",
  verificationUrl: "https://auth.openai.com/codex/device",
  userCode: "ABCD-1234",
});
