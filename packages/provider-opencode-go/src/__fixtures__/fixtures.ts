import type { OpenCodeGoUsage } from "../schema.js";

export const successFixture = (): OpenCodeGoUsage => ({
  usage: {
    rolling: { status: "ok", percent: 12, resetsAt: "2026-09-05T18:00:00.000Z" },
    weekly: { status: "ok", percent: 34, resetsAt: "2026-09-09T12:00:00.000Z" },
    monthly: { status: "ok", percent: 56, resetsAt: "2026-09-22T12:00:00.000Z" },
  },
});

export const rateLimitedFixture = (): OpenCodeGoUsage => ({
  usage: {
    rolling: { status: "rate-limited", percent: 100, resetsAt: "2026-09-05T18:00:00.000Z" },
    weekly: { status: "ok", percent: 12, resetsAt: "2026-09-09T12:00:00.000Z" },
    monthly: null,
  },
});

export const overHundredFixture = (): OpenCodeGoUsage => ({
  usage: {
    rolling: { status: "ok", percent: 115, resetsAt: "2026-09-05T18:00:00.000Z" },
    weekly: { status: "ok", percent: -5, resetsAt: "2026-09-09T12:00:00.000Z" },
    monthly: { status: "ok", percent: 99.9, resetsAt: "2026-09-22T12:00:00.000Z" },
  },
});

export const missingFieldsFixture = (): OpenCodeGoUsage => ({
  usage: {
    rolling: { status: "ok", percent: 10, resetsAt: "2026-09-05T18:00:00.000Z" },
    weekly: undefined,
    monthly: { status: "ok", percent: 20, resetsAt: "2026-09-22T12:00:00.000Z" },
  },
});

/** HTTP error fixtures. */
export const authErrorBody = '{"type":"error","error":{"type":"AuthError","message":"Unauthorized"}}';
export const entitlementErrorBody =
  '{"type":"error","error":{"type":"EntitlementError","message":"OpenCode Go subscription required."}}';
export const missingKeyBody = '{"type":"error","error":{"type":"AuthError","message":"Missing API key."}}';

export const badJsonBody = "not-json{{{";
export const unknownShape2xx = '{"unexpected":true}';