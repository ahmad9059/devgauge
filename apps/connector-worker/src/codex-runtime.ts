import { createHash } from "node:crypto";

import type { Db, ProfileArtifactRow } from "@devgauge/database";
import { clearPreviousProfileArtifact, getOwnedProfileArtifact, saveProfileArtifact } from "@devgauge/database";
import { createCryptoService } from "@devgauge/provider-core";
import type { ArchivedProfile } from "@devgauge/provider-codex";

import type { WorkerEnv } from "./env.js";
import type { ObjectStorage } from "./object-storage.js";

export interface CodexProfileContext {
  artifact?: ArchivedProfile;
  persist: (artifact: ArchivedProfile) => Promise<void>;
}

export const createCodexProfileContext = async (
  env: WorkerEnv,
  db: Db,
  storage: ObjectStorage,
  input: { userId: string; connectionId: string }
): Promise<CodexProfileContext> => {
  if (!env.ENC_MASTER_KEY) throw new Error("ENC_MASTER_KEY is required for Codex profiles");
  const crypto = createCryptoService(env.ENC_MASTER_KEY);
  const current = await getOwnedProfileArtifact(db, input.connectionId, input.userId);
  let artifact: ArchivedProfile | undefined;
  if (current) {
    if (current.previousObjectKey) {
      await storage.delete(current.previousObjectKey);
      await clearPreviousProfileArtifact(db, {
        connectionId: input.connectionId,
        userId: input.userId,
        artifactVersion: current.artifactVersion,
        objectKey: current.previousObjectKey,
      });
    }
    const ciphertext = await storage.get(current.objectKey);
    artifact = {
      bytes: crypto.open({
        ciphertext,
        wrappedDataKey: Buffer.from(current.wrappedDataKey),
        keyVersion: current.keyVersion,
      }),
      digest: current.digest,
    };
  }

  return {
    ...(artifact ? { artifact } : {}),
    persist: async (next) => {
      const expectedVersion = current?.artifactVersion ?? 0;
      const nextVersion = expectedVersion + 1;
      const objectKey = `codex-profiles/${input.userId}/${input.connectionId}/${nextVersion}.bin`;
      const envelope = crypto.seal(next.bytes);
      await storage.put(objectKey, envelope.ciphertext);
      let saved: ProfileArtifactRow | undefined;
      try {
        saved = await saveProfileArtifact(db, {
          userId: input.userId,
          connectionId: input.connectionId,
          objectKey,
          digest: next.digest,
          wrappedDataKey: envelope.wrappedDataKey,
          keyVersion: envelope.keyVersion,
          sizeBytes: envelope.ciphertext.length,
          expectedVersion,
        });
      } finally {
        if (!saved) await storage.delete(objectKey).catch(() => undefined);
      }
      if (!saved) throw new Error("Codex profile changed during this job");
      if (saved.previousObjectKey) {
        await storage.delete(saved.previousObjectKey);
        await clearPreviousProfileArtifact(db, {
          connectionId: input.connectionId,
          userId: input.userId,
          artifactVersion: saved.artifactVersion,
          objectKey: saved.previousObjectKey,
        });
      }
    },
  };
};

export const hashCodexLoginId = (loginId: string): string =>
  createHash("sha256").update(`codex-login:${loginId}`).digest("hex");
