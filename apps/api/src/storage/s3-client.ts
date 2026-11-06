import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { Env } from '../config/env-config';

export interface PutObjectParams {
  key: string;
  body: Buffer;
  contentType: string;
  cacheControl: string;
}

export interface ObjectStorage {
  putObject(params: PutObjectParams): Promise<void>;
}

/** The only S3 surface we use; tests inject a recorder here. */
export interface S3Sender {
  send(command: PutObjectCommand): Promise<unknown>;
}

export const createS3Storage = (env: Env, sender?: S3Sender): ObjectStorage => {
  const client: S3Sender =
    sender ??
    new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
    });
  return {
    async putObject({ key, body, contentType, cacheControl }) {
      await client.send(
        new PutObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: key,
          Body: body,
          ContentType: contentType,
          CacheControl: cacheControl,
        }),
      );
    },
  };
};
