import { z } from "zod";

/** Authenticated session claims attached to an authorized request. */
export const sessionClaimsSchema = z.object({
  userId: z.string().uuid(),
  sessionId: z.string().uuid(),
  email: z.string().email(),
  locale: z.string().default("en"),
  timezone: z.string().default("UTC"),
  lifecycleStatus: z.string().default("active"),
});

export type SessionClaims = z.infer<typeof sessionClaimsSchema>;

export const meSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  locale: z.string(),
  timezone: z.string(),
  lifecycleStatus: z.string(),
  createdAt: z.string().datetime({ offset: true }),
});

export type Me = z.infer<typeof meSchema>;

export const magicLinkRequestSchema = z.object({
  email: z.string().email(),
});

export const magicLinkVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().min(6).max(8),
});

export const sessionResponseSchema = z.object({
  token: z.string(),
  expiresAt: z.string().datetime({ offset: true }),
});

export type SessionResponse = z.infer<typeof sessionResponseSchema>;