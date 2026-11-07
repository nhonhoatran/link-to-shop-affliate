import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { seedFileSchema, type SeedFile } from '@under30ss/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { OutfitModel } from '../src/models/outfit-model';
import { seedOutfits } from '../src/services/seed-service';
import { makePng, startTestApp, type TestApp } from './helpers/test-app';

let testApp: TestApp;
let seedDir: string;

const seedItem = (id: string, file: string, side: 'left' | 'right', affiliateUrl: string) => ({
  id,
  name: `Item ${id}`,
  image: { file, width: 100, height: 100 },
  side,
  order: 0,
  anchor: { x: 50, y: 50 },
  affiliateUrl,
});

const buildSeed = (overrides: { status?: 'draft' | 'published'; link?: string } = {}): SeedFile =>
  seedFileSchema.parse({
    version: 1,
    outfits: [
      {
        slug: 'seeded-look',
        title: 'Seeded look',
        modelImage: { file: 'images/model.png', width: 600, height: 900 },
        status: overrides.status ?? 'published',
        featured: true,
        items: [
          seedItem('a', 'images/item-a.png', 'left', overrides.link ?? ''),
          seedItem('b', 'images/item-b.png', 'right', overrides.link ?? ''),
        ],
      },
    ],
  });

beforeAll(async () => {
  testApp = await startTestApp();
  seedDir = await mkdtemp(join(tmpdir(), 'u30-seed-'));
  await mkdir(join(seedDir, 'images'));
  await writeFile(join(seedDir, 'images/model.png'), await makePng(600, 900));
  await writeFile(join(seedDir, 'images/item-a.png'), await makePng(120, 120));
  await writeFile(join(seedDir, 'images/item-b.png'), await makePng(140, 100));
});

afterAll(async () => {
  await rm(seedDir, { recursive: true, force: true });
  await testApp.stop();
});

beforeEach(async () => {
  await OutfitModel.deleteMany({});
  testApp.s3Puts.length = 0;
});

describe('seed service', () => {
  it('is idempotent: a second run updates in place with identical keys', async () => {
    const seed = buildSeed({ link: 'https://shop.example.com/x' });
    const first = await seedOutfits(testApp.ctx, seed, { seedDir, publishWithPlaceholder: false });
    const before = await OutfitModel.findOne({ slug: 'seeded-look' }).lean();
    await seedOutfits(testApp.ctx, seed, { seedDir, publishWithPlaceholder: false });
    const after = await OutfitModel.findOne({ slug: 'seeded-look' }).lean();

    expect(first).toEqual([{ slug: 'seeded-look', status: 'published', downgradedToDraft: false }]);
    expect(await OutfitModel.countDocuments()).toBe(1);
    expect(after?.modelImage.key).toBe(before?.modelImage.key);
    expect(after?.modelImage.key).toMatch(/^public\/model\/seed\/[0-9a-f]{24}\.webp$/);
    expect(after?.featured).toBe(true);
    expect(after?.items.map((item) => item.image.key)).toEqual(before?.items.map((item) => item.image.key));
    expect(testApp.s3Puts.every((put) => String(put.Key).startsWith('public/'))).toBe(true);
  });

  it('stores real processed dimensions rather than the declared ones', async () => {
    await seedOutfits(testApp.ctx, buildSeed({ link: 'https://shop.example.com/x' }), { seedDir, publishWithPlaceholder: false });
    const stored = await OutfitModel.findOne({ slug: 'seeded-look' }).lean();
    expect(stored?.items.find((item) => item.id === 'b')?.image).toMatchObject({ width: 140, height: 100 });
  });

  it('saves a publish-requested outfit without links as a draft', async () => {
    const [result] = await seedOutfits(testApp.ctx, buildSeed(), { seedDir, publishWithPlaceholder: false });
    expect(result).toMatchObject({ status: 'draft', downgradedToDraft: true });
    expect((await OutfitModel.findOne({ slug: 'seeded-look' }).lean())?.status).toBe('draft');
  });

  it('keeps published status with --publish-with-placeholder, but refuses it in production', async () => {
    const [result] = await seedOutfits(testApp.ctx, buildSeed(), { seedDir, publishWithPlaceholder: true });
    expect(result).toMatchObject({ status: 'published', downgradedToDraft: false });

    const productionCtx = { ...testApp.ctx, env: { ...testApp.env, NODE_ENV: 'production' as const } };
    await expect(seedOutfits(productionCtx, buildSeed(), { seedDir, publishWithPlaceholder: true })).rejects.toThrow(/production/);
  });

  it('fails with a clear message for a missing or escaping image path', async () => {
    const missing = buildSeed();
    missing.outfits[0]!.modelImage.file = 'images/nope.png';
    await expect(seedOutfits(testApp.ctx, missing, { seedDir, publishWithPlaceholder: false })).rejects.toThrow(/not found/);

    const escaping = buildSeed();
    escaping.outfits[0]!.modelImage.file = '../outside.png';
    await expect(seedOutfits(testApp.ctx, escaping, { seedDir, publishWithPlaceholder: false })).rejects.toThrow(/escapes/);
  });

  it('reads images outside the seed directory while they stay inside imageRoot', async () => {
    const seed = buildSeed();
    const outfit = seed.outfits[0]!;
    for (const image of [outfit.modelImage, ...outfit.items.map((item) => item.image)]) image.file = `../${image.file}`;
    const options = { seedDir: join(seedDir, 'images'), imageRoot: seedDir, publishWithPlaceholder: false };
    await expect(seedOutfits(testApp.ctx, seed, options)).resolves.toHaveLength(1);

    outfit.modelImage.file = '../../outside.png';
    await expect(seedOutfits(testApp.ctx, seed, options)).rejects.toThrow(/escapes/);
  });

  it('accepts file names that merely start with two dots', async () => {
    await writeFile(join(seedDir, 'images/..dotted.png'), await makePng(100, 100));
    const seed = buildSeed({ link: 'https://shop.example.com/x' });
    seed.outfits[0]!.modelImage.file = 'images/..dotted.png';
    await expect(seedOutfits(testApp.ctx, seed, { seedDir, publishWithPlaceholder: false })).resolves.toHaveLength(1);
  });

  it('rejects a symlink inside the image root that points outside it', async () => {
    const outside = await mkdtemp(join(tmpdir(), 'u30-outside-'));
    try {
      await writeFile(join(outside, 'secret.png'), await makePng(100, 100));
      try {
        await symlink(join(outside, 'secret.png'), join(seedDir, 'images/link.png'));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EPERM') return; // Windows without symlink privilege
        throw error;
      }
      const seed = buildSeed({ link: 'https://shop.example.com/x' });
      seed.outfits[0]!.modelImage.file = 'images/link.png';
      await expect(seedOutfits(testApp.ctx, seed, { seedDir, publishWithPlaceholder: false })).rejects.toThrow(/escapes/);
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });
});
