import { createApp } from './create-app';
import { getEnv } from './config/env-config';
import { connectMongo, disconnectMongo } from './db/mongo-connection';
import { loadDotenv } from './lib/load-dotenv';
import { warmUpDummyHash } from './services/password-service';
import { createRevalidator } from './services/revalidate-web-service';
import { createS3Storage } from './storage/s3-client';

const main = async (): Promise<void> => {
  loadDotenv();
  const env = getEnv();
  await connectMongo(env.MONGODB_URI);
  await warmUpDummyHash();

  const app = createApp({ env, storage: createS3Storage(env), revalidate: createRevalidator(env) });
  const server = app.listen(env.PORT, () => console.log(`[api] listening on :${env.PORT}`));

  const shutdown = (signal: string): void => {
    console.log(`[api] ${signal} received, shutting down`);
    server.close(() => {
      disconnectMongo().finally(() => process.exit(0));
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

main().catch((error: unknown) => {
  console.error('[api] failed to start:', error instanceof Error ? error.message : error);
  process.exit(1);
});
