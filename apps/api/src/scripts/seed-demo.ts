import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { demoSeedFileSchema } from '@under30ss/shared';
import { getEnv } from '../config/env-config';
import { connectMongo, disconnectMongo } from '../db/mongo-connection';
import { loadDotenv } from '../lib/load-dotenv';
import { zodIssuesToFields } from '../lib/zod-fields';
import { createRevalidator } from '../services/revalidate-web-service';
import { seedDemo } from '../services/seed-demo-service';
import { createS3Storage } from '../storage/s3-client';

const REPO_ROOT = resolve(__dirname, '../../../..');
const DEFAULT_SEED_FILE = resolve(REPO_ROOT, 'seed/demo/demo-seed.json');

const readPathArg = (argv: string[], flag: string, fallback: string): string => {
  const index = argv.indexOf(flag);
  const value = index === -1 ? undefined : argv[index + 1];
  return value ? resolve(process.cwd(), value) : fallback;
};

// Usage: pnpm seed:demo [--reset] [--file seed/demo/demo-seed.json] [--image-root .]
// Also meant for production (see docs/deployment-guide.md): the repo's seed/ and assets-source/ are mounted into the
// api container and the built script runs there. `--reset` drops existing content, so pass it on purpose.
const main = async (): Promise<void> => {
  loadDotenv();
  const argv = process.argv.slice(2);
  const seedPath = readPathArg(argv, '--file', DEFAULT_SEED_FILE);
  const imageRoot = readPathArg(argv, '--image-root', REPO_ROOT);
  const parsed = demoSeedFileSchema.safeParse(JSON.parse(await readFile(seedPath, 'utf8')));
  if (!parsed.success) {
    const details = Object.entries(zodIssuesToFields(parsed.error.issues)).map(([path, message]) => `  ${path}: ${message}`);
    throw new Error(`Invalid demo seed file ${seedPath}:\n${details.join('\n')}`);
  }

  const env = getEnv();
  const ctx = { env, storage: createS3Storage(env), revalidate: createRevalidator(env) };
  await connectMongo(env.MONGODB_URI);
  try {
    const summary = await seedDemo(ctx, parsed.data, { seedDir: dirname(seedPath), imageRoot, reset: argv.includes('--reset') });
    console.log(
      `Demo seeded: ${summary.collections} collections, ${summary.outfits} outfits, ${summary.sections} home sections, ${summary.subscribers} subscribers`,
    );
  } finally {
    await disconnectMongo();
  }
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
