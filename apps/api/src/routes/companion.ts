import { createHash, randomBytes } from "node:crypto";

import type { FastifyInstance } from "fastify";

import { errorEnvelopeSchema } from "@devgauge/contracts";
import {
  consumePairingCode,
  createPairingCode,
  findActiveCompanionByCredential,
  hashPairingCode,
  insertSnapshot,
  insertWindows,
  listCompanionDevicesByUser,
  registerCompanionDevice,
  revokeCompanionDevice,
  setLatestUsage,
  touchCompanionDevice,
  upsertConnection,
} from "@devgauge/database";
import { minimizeToUsage } from "@devgauge/provider-claude-code";

const ADAPTER_VERSION = "companion-0.1.0";
export const PAIRING_TTL_MINUTES = 10;

const deviceSecretHash = (secret: string): string => createHash("sha256").update(`companion:${secret}`).digest("hex");
const generateDeviceSecret = (): string => randomBytes(32).toString("base64url");

export const buildCompanionRoutes = (app: FastifyInstance): void => {
  // Authenticated user requests a short-lived, single-use pairing code.
  app.post("/v1/companion/codes", { preHandler: app.requireAuth }, async (request) => {
    const auth = request.auth!;
    const code = randomBytes(4).toString("hex").toUpperCase(); // 8-char code
    await createPairingCode(app.db, {
      userId: auth.userId,
      codeHash: hashPairingCode(code),
      ttlMinutes: PAIRING_TTL_MINUTES,
    });
    return { code, expiresInSeconds: PAIRING_TTL_MINUTES * 60 };
  });

  // Companion exchanges the code for a revocable device credential.
  app.post("/v1/companion/pair", async (request, reply) => {
    const body = (request.body ?? {}) as { code?: string };
    if (!body.code) {
      return reply.code(400).send(
        errorEnvelopeSchema.parse({ error: { code: "invalid_input", message: "code required", requestId: request.id } })
      );
    }
    const pairing = await consumePairingCode(app.db, hashPairingCode(body.code.trim()));
    if (!pairing) {
      return reply.code(401).send(
        errorEnvelopeSchema.parse({
          error: { code: "provider_unauthorized", message: "Invalid or expired pairing code", requestId: request.id },
        })
      );
    }
    const secret = generateDeviceSecret();
    const device = await registerCompanionDevice(app.db, {
      userId: pairing.userId,
      deviceLabel: "desktop",
      credentialHash: deviceSecretHash(secret),
    });
    return { deviceId: device.id, deviceSecret: secret, accountEmail: null, alias: "desktop" };
  });

  // Companion syncs a minimized snapshot (device-credential authenticated).
  app.post("/v1/companion/snapshots", async (request, reply) => {
    const deviceId = (request.headers["x-device-id"] as string | undefined) ?? "";
    const auth = (request.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
    if (!deviceId || !auth) {
      return reply.code(401).send(
        errorEnvelopeSchema.parse({ error: { code: "unauthenticated", message: "Device credential required", requestId: request.id } })
      );
    }
    const device = await findActiveCompanionByCredential(app.db, deviceSecretHash(auth));
    if (!device || device.id !== deviceId) {
      return reply.code(401).send(
        errorEnvelopeSchema.parse({ error: { code: "unauthenticated", message: "Invalid or revoked device", requestId: request.id } })
      );
    }
    void touchCompanionDevice(app.db, device.id);

    const snapshot = request.body as {
      schemaVersion?: number;
      capturedAt?: string;
      localSequence?: number;
      claudeCodeVersion?: string;
      rateLimits?: Record<string, { used_percentage: number; resets_at: number }>;
    };
    if (snapshot?.schemaVersion !== 1 || !snapshot.capturedAt || typeof snapshot.localSequence !== "number") {
      return reply.code(400).send(
        errorEnvelopeSchema.parse({ error: { code: "invalid_input", message: "Malformed snapshot", requestId: request.id } })
      );
    }
    const capturedMs = new Date(snapshot.capturedAt).getTime();
    if (Number.isNaN(capturedMs) || Math.abs(Date.now() - capturedMs) > 24 * 3_600_000) {
      return reply.code(400).send(
        errorEnvelopeSchema.parse({ error: { code: "invalid_input", message: "Clock skew too large", requestId: request.id } })
      );
    }

    const connection = await upsertConnection(app.db, { userId: device.userId, provider: "claude-code", plan: "max" });
    const usage = minimizeToUsage({
      schemaVersion: 1,
      deviceId: device.id,
      capturedAt: snapshot.capturedAt,
      localSequence: snapshot.localSequence,
      ...(snapshot.claudeCodeVersion ? { claudeCodeVersion: snapshot.claudeCodeVersion } : {}),
      ...(snapshot.rateLimits ? { rateLimits: snapshot.rateLimits as never } : {}),
    });

    const snapshotId = await insertSnapshot(app.db, {
      userId: device.userId,
      connectionId: connection.id,
      provider: "claude-code",
      plan: "max",
      contentHash: createHash("sha256").update(JSON.stringify(usage)).digest("hex").slice(0, 32),
      source: usage.source,
      adapterVersion: snapshot.claudeCodeVersion ? `${ADAPTER_VERSION}+${snapshot.claudeCodeVersion}` : ADAPTER_VERSION,
      fetchedAt: usage.fetchedAt,
      capturedAt: usage.capturedAt ?? null,
      stale: false,
      responseStatus: 200,
    });
    await insertWindows(app.db, snapshotId, usage.windows);
    await setLatestUsage(app.db, {
      userId: device.userId,
      provider: "claude-code",
      connectionId: connection.id,
      snapshotId,
    });

    return { ok: true, snapshotId, serverTime: new Date().toISOString() };
  });

  // Authenticated user lists their companion devices.
  app.get("/v1/companion/devices", { preHandler: app.requireAuth }, async (request) => {
    const auth = request.auth!;
    const devices = await listCompanionDevicesByUser(app.db, auth.userId);
    return {
      devices: devices.map((d) => ({
        id: d.id,
        label: d.deviceLabel,
        lastSeenAt: d.lastSeenAt.toISOString(),
        revokedAt: d.revokedAt ? d.revokedAt.toISOString() : null,
      })),
    };
  });

  // Authenticated user revokes a companion device.
  app.post("/v1/companion/devices/:deviceId/revoke", { preHandler: app.requireAuth }, async (request) => {
    const auth = request.auth!;
    const { deviceId } = request.params as { deviceId: string };
    await revokeCompanionDevice(app.db, deviceId, auth.userId);
    return { ok: true };
  });
};