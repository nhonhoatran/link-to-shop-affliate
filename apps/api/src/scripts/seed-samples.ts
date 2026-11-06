import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { seedFileSchema } from '@under30ss/shared';
import { getEnv } from '../config/env-config';
import { connectMongo, disconnectMongo } from '../db/mongo-connection';
import { loadDotenv } from '../lib/load-dotenv';
import { zodIssuesToFields } from '../lib/zod-fields';
import { outfitPaths, createRevalidator } from '../services/revalidate-web-service';
import { seedOutfits } from '../services/seed-service';
import { createS3Storage } from '../storage/s3-client';

const DEFAULT_SEED_FILE = resolve(__dirname, '../../../../seed/sample-outfits.json');

const readFileArg = (argv: string[]): string => {
  const index = argv.indexOf('--file');
  const value = index === -1 ? undefined : argv[index + 1];
  return value ? resolve(process.cwd(), value) : DEFAULT_SEED_FILE;
};

const main = async (): Promise<void> => {
  loadDotenv();
  const argv = process.argv.slice(2);
  const seedPath = readFileArg(argv);
  const parsed = seedFileSchema.safeParse(JSON.parse(await readFile(seedPath, 'utf8')));
  if (!parsed.success) {
    const details = Object.entries(zodIssuesToFields(parsed.error.issues)).map(([path, message]) => `  ${path}: ${message}`);
    throw new Error(`Invalid seed file ${seedPath}:\n${details.join('\n')}`);
  }

  const env = getEnv();
  const ctx = { env, storage: createS3Storage(env), revalidate: createRevalidator(env) };
  await connectMongo(env.MONGODB_URI);
  try {
    const results = await seedOutfits(ctx, parsed.data, {
      seedDir: dirname(seedPath),
      publishWithPlaceholder: argv.includes('--publish-with-placeholder'),
    });
    for (const result of results) {
      const note = result.downgradedToDraft ? ' (saved as draft: links or anchors missing)' : '';
      console.log(`${result.slug}: ${result.status}${note}`);
    }
    await ctx.revalidate(outfitPaths(...results.map((result) => result.slug)));
  } finally {
    await disconnectMongo();
  }
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
