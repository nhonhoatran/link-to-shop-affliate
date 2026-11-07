import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import {
  outfitInputSchema,
  type ImageRef,
  type MediaKind,
  type OutfitInput,
  type SeedFile,
  type SeedImage,
  type SeedOutfit,
} from '@under30ss/shared';
import type { AppContext } from '../lib/app-context';
import { PUBLIC_KEY_PREFIX } from '../lib/public-key-prefix';
import { storeImage } from './media-service';
import { upsertOutfitBySlug } from './outfit-service';

export interface SeedOptions {
  /** Directory the `file` paths in the seed file are relative to. */
  seedDir: string;
  /** Images must stay inside this directory (defaults to `seedDir`); lets the seed reuse assets kept beside it. */
  imageRoot?: string;
  /** Local only: keep `published` status even when links or anchors are missing. */
  publishWithPlaceholder: boolean;
}

export interface SeedResult {
  slug: string;
  status: OutfitInput['status'];
  downgradedToDraft: boolean;
}

const isInside = (root: string, target: string): boolean => {
  const rel = relative(root, target);
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
};

const readSeedImage = async (options: SeedOptions, file: string): Promise<Buffer> => {
  const root = options.imageRoot ?? options.seedDir;
  const absolute = resolve(options.seedDir, file);
  // Compare real paths so a symlink inside the root cannot point outside it.
  let real: string;
  try {
    real = await realpath(absolute);
  } catch {
    if (!isInside(root, absolute)) throw new Error(`Seed image escapes the image root ${root}: ${file}`);
    throw new Error(`Seed image not found: ${file} (resolved to ${absolute})`);
  }
  if (!isInside(await realpath(root), real)) throw new Error(`Seed image escapes the image root ${root}: ${file}`);
  return readFile(real);
};

// Content-addressed keys make re-running the seed idempotent and avoid orphan objects.
const uploadSeedImage = async (
  ctx: AppContext,
  options: SeedOptions,
  kind: MediaKind,
  image: SeedImage,
): Promise<ImageRef> => {
  const bytes = await readSeedImage(options, image.file);
  const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 24);
  return storeImage(ctx, kind, bytes, `${PUBLIC_KEY_PREFIX}${kind}/seed/${digest}.webp`);
};

const buildInput = async (ctx: AppContext, options: SeedOptions, outfit: SeedOutfit): Promise<OutfitInput> => ({
  slug: outfit.slug,
  title: outfit.title,
  ...(outfit.seoDescription ? { seoDescription: outfit.seoDescription } : {}),
  modelImage: await uploadSeedImage(ctx, options, 'model', outfit.modelImage),
  status: outfit.status,
  featured: outfit.featured,
  items: await Promise.all(
    outfit.items.map(async (item) => ({ ...item, image: await uploadSeedImage(ctx, options, 'item', item.image) })),
  ),
});

export const seedOutfits = async (ctx: AppContext, seed: SeedFile, options: SeedOptions): Promise<SeedResult[]> => {
  if (options.publishWithPlaceholder && ctx.env.NODE_ENV === 'production') {
    throw new Error('--publish-with-placeholder is refused when NODE_ENV=production');
  }
  const results: SeedResult[] = [];
  for (const outfit of seed.outfits) {
    const input = await buildInput(ctx, options, outfit);
    // Parsing as a draft validates everything except the publish rule.
    outfitInputSchema.parse({ ...input, status: 'draft' });
    const publishable = input.status === 'draft' || outfitInputSchema.safeParse(input).success;
    const downgradedToDraft = !publishable && !options.publishWithPlaceholder;
    const status = downgradedToDraft ? 'draft' : input.status;
    await upsertOutfitBySlug({ ...input, status });
    results.push({ slug: outfit.slug, status, downgradedToDraft });
  }
  return results;
};
