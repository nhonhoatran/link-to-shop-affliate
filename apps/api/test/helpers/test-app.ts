import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { PutObjectCommandInput } from '@aws-sdk/client-s3';
import type { Express } from 'express';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import sharp from 'sharp';
import supertest from 'supertest';
import { inject } from 'vitest';
import { parseEnv, type Env } from '../../src/config/env-config';
import { createApp } from '../../src/create-app';
import { connectMongo, disconnectMongo } from '../../src/db/mongo-connection';
import type { AppContext } from '../../src/lib/app-context';
import { createAdmin } from '../../src/services/admin-user-service';
import { createRevalidator } from '../../src/services/revalidate-web-service';
import { createS3Storage } from '../../src/storage/s3-client';

export const TEST_ORIGIN = 'http://localhost:8080';
export const TEST_EMAIL = 'admin@example.com';
export const TEST_PASSWORD = 'correct-horse-battery';
export const REVALIDATE_SECRET = 'revalidate-secret-1234';

export interface RevalidateHit {
  secret: string | undefined;
  paths: string[];
  tags: string[];
  scope?: 'all';
}

export interface TestApp {
  app: Express;
  ctx: AppContext;
  env: Env;
  s3Puts: PutObjectCommandInput[];
  revalidateHits: RevalidateHit[];
  setWebStatus(status: number): void;
  stop(): Promise<void>;
}

const startWebStub = async (hits: RevalidateHit[], statusRef: { value: number }): Promise<{ server: Server; url: string }> => {
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { paths?: string[]; tags?: string[]; scope?: 'all' };
      const paths = body.paths ?? [];
      hits.push({
        secret: req.headers['x-revalidate-secret'] as string | undefined,
        paths,
        tags: body.tags ?? [],
        ...(body.scope ? { scope: body.scope } : {}),
      });
      res.writeHead(statusRef.value, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ revalidated: [...paths, ...(body.tags ?? [])] }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return { server, url: `http://127.0.0.1:${port}/api/revalidate` };
};

export const startTestApp = async (envOverrides: Record<string, string> = {}): Promise<TestApp> => {
  const dbName = `under30ss-test-${randomUUID()}`;
  const hits: RevalidateHit[] = [];
  const statusRef = { value: 200 };
  const web = await startWebStub(hits, statusRef);
  const env = parseEnv({
    NODE_ENV: 'test',
    MONGODB_URI: `${inject('mongoBaseUri')}${dbName}`,
    SESSION_SECRET: 'test-session-secret-at-least-32-characters',
    S3_ENDPOINT: 'http://127.0.0.1:9000',
    S3_BUCKET: 'under30ss-test',
    S3_ACCESS_KEY: 'test-access',
    S3_SECRET_KEY: 'test-secret',
    MEDIA_PUBLIC_BASE_URL: 'http://cdn.test/media',
    WEB_REVALIDATE_URL: web.url,
    REVALIDATE_SECRET,
    ALLOWED_ORIGIN: TEST_ORIGIN,
    ...envOverrides,
  });
  await connectMongo(env.MONGODB_URI);

  const s3Puts: PutObjectCommandInput[] = [];
  const storage = createS3Storage(env, {
    send: async (command) => {
      s3Puts.push(command.input);
    },
  });
  const ctx: AppContext = { env, storage, revalidate: createRevalidator(env) };

  return {
    app: createApp(ctx),
    ctx,
    env,
    s3Puts,
    revalidateHits: hits,
    setWebStatus: (status) => {
      statusRef.value = status;
    },
    stop: async () => {
      await mongoose.connection.dropDatabase();
      await disconnectMongo();
      await new Promise<void>((resolve) => web.server.close(() => resolve()));
    },
  };
};

export const loggedInAgent = async (testApp: TestApp, email = TEST_EMAIL) => {
  await createAdmin(email, TEST_PASSWORD);
  const agent = supertest.agent(testApp.app);
  const response = await agent.post('/api/auth/login').set('Origin', TEST_ORIGIN).send({ email, password: TEST_PASSWORD });
  if (response.status !== 200) throw new Error(`test login failed: ${response.status}`);
  return agent;
};

export const makePng = (width: number, height: number, alpha = 1): Promise<Buffer> =>
  sharp({ create: { width, height, channels: 4, background: { r: 200, g: 30, b: 30, alpha } } })
    .png()
    .toBuffer();
