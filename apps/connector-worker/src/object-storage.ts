import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import type { WorkerEnv } from "./env.js";

export interface ObjectStorage {
  get(key: string): Promise<Buffer>;
  put(key: string, body: Buffer): Promise<void>;
  delete(key: string): Promise<void>;
}

export const createObjectStorage = (env: WorkerEnv): ObjectStorage => {
  if (!env.S3_ENDPOINT || !env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    throw new Error("S3 profile storage configuration is required");
  }
  const bucket = env.S3_BUCKET;
  const client = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });
  return {
    async get(key) {
      const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      if (!response.Body) throw new Error("Codex profile artifact body is missing");
      return Buffer.from(await response.Body.transformToByteArray());
    },
    async put(key, body) {
      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: "application/octet-stream",
      }));
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
};
