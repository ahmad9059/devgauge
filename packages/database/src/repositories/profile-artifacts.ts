import type { Db } from "../client.js";

export interface ProfileArtifactRow {
  id: string;
  userId: string;
  connectionId: string;
  objectKey: string;
  previousObjectKey: string | null;
  digest: string;
  wrappedDataKey: Uint8Array;
  keyVersion: number;
  artifactVersion: number;
  sizeBytes: number;
  status: string;
  updatedAt: Date;
}

export const getOwnedProfileArtifact = async (
  db: Db,
  connectionId: string,
  userId: string
): Promise<ProfileArtifactRow | undefined> => {
  const rows = await db`
    select * from provider_profile_artifacts
    where connection_id = ${connectionId} and user_id = ${userId} and status = 'ready'
  `;
  return rows[0] as unknown as ProfileArtifactRow | undefined;
};

/** Compare-and-swap prevents an older job from replacing a newer profile. */
export const saveProfileArtifact = async (
  db: Db,
  input: {
    userId: string;
    connectionId: string;
    objectKey: string;
    digest: string;
    wrappedDataKey: Uint8Array;
    keyVersion: number;
    sizeBytes: number;
    expectedVersion: number;
  }
): Promise<ProfileArtifactRow | undefined> => {
  const rows = await db`
    insert into provider_profile_artifacts (
      user_id, connection_id, object_key, digest, wrapped_data_key, key_version,
      artifact_version, size_bytes, status
    ) values (
      ${input.userId}, ${input.connectionId}, ${input.objectKey}, ${input.digest},
      ${input.wrappedDataKey}, ${input.keyVersion}, 1, ${input.sizeBytes}, 'ready'
    )
    on conflict (connection_id) do update
      set previous_object_key = provider_profile_artifacts.object_key,
          object_key = excluded.object_key,
          digest = excluded.digest,
          wrapped_data_key = excluded.wrapped_data_key,
          key_version = excluded.key_version,
          size_bytes = excluded.size_bytes,
          artifact_version = provider_profile_artifacts.artifact_version + 1,
          status = 'ready',
          updated_at = now()
      where provider_profile_artifacts.artifact_version = ${input.expectedVersion}
    returning *
  `;
  return rows[0] as unknown as ProfileArtifactRow | undefined;
};

export const clearPreviousProfileArtifact = async (
  db: Db,
  input: { connectionId: string; userId: string; artifactVersion: number; objectKey: string }
): Promise<void> => {
  await db`
    update provider_profile_artifacts
    set previous_object_key = null, updated_at = now()
    where connection_id = ${input.connectionId}
      and user_id = ${input.userId}
      and artifact_version = ${input.artifactVersion}
      and previous_object_key = ${input.objectKey}
  `;
};

export const deleteOwnedProfileArtifact = async (
  db: Db,
  connectionId: string,
  userId: string
): Promise<ProfileArtifactRow | undefined> => {
  const rows = await db`
    delete from provider_profile_artifacts
    where connection_id = ${connectionId} and user_id = ${userId}
    returning *
  `;
  return rows[0] as unknown as ProfileArtifactRow | undefined;
};
