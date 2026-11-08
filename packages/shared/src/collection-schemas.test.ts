import { describe, expect, it } from 'vitest';
import {
  adminCollectionListQuerySchema,
  collectionMoveRequestSchema,
  collectionOutfitsRequestSchema,
  MAX_COLLECTION_OUTFITS_PER_REQUEST,
} from './collection-contract';
import { collectionInputSchema } from './collection-schemas';

const image = { key: 'public/collections/a.webp', width: 800, height: 1000 };
const base = { slug: 'ao-thun', name: 'Áo thun', status: 'draft' };
const ID = '64b7f0c2a1b2c3d4e5f60701';

const issuePaths = (input: unknown) => {
  const result = collectionInputSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('collectionInputSchema', () => {
  it('accepts a draft without a cover image', () => {
    expect(collectionInputSchema.safeParse(base).success).toBe(true);
  });

  it('requires a cover image to publish and reports it at coverImage', () => {
    expect(issuePaths({ ...base, status: 'published' })).toEqual(['coverImage']);
    expect(collectionInputSchema.safeParse({ ...base, status: 'published', coverImage: image }).success).toBe(true);
  });

  it('rejects the reserved slug "slugs" at slug', () => {
    expect(issuePaths({ ...base, slug: 'slugs' })).toEqual(['slug']);
    expect(collectionInputSchema.safeParse({ ...base, slug: 'slugs-2' }).success).toBe(true);
  });

  it.each([
    ['name too long', { name: 'x'.repeat(81) }],
    ['empty name', { name: '' }],
    ['description too long', { description: 'x'.repeat(501) }],
    ['seoDescription too long', { seoDescription: 'x'.repeat(301) }],
    ['bad slug', { slug: 'Ao Thun' }],
  ])('rejects %s', (_name, override) => {
    expect(collectionInputSchema.safeParse({ ...base, ...override }).success).toBe(false);
  });

  it('drops unknown keys such as order', () => {
    const result = collectionInputSchema.parse({ ...base, order: 3 });
    expect('order' in result).toBe(false);
  });
});

describe('collection request schemas', () => {
  it('list query defaults page to 1 and rejects an unknown status', () => {
    expect(adminCollectionListQuerySchema.parse({}).page).toBe(1);
    expect(adminCollectionListQuerySchema.safeParse({ status: 'archived' }).success).toBe(false);
  });

  it('move accepts only up or down', () => {
    expect(collectionMoveRequestSchema.safeParse({ direction: 'up' }).success).toBe(true);
    expect(collectionMoveRequestSchema.safeParse({ direction: 'left' }).success).toBe(false);
  });

  it('outfits request needs 1..48 object ids', () => {
    expect(collectionOutfitsRequestSchema.safeParse({ outfitIds: [ID] }).success).toBe(true);
    expect(collectionOutfitsRequestSchema.safeParse({ outfitIds: [] }).success).toBe(false);
    expect(collectionOutfitsRequestSchema.safeParse({ outfitIds: ['nope'] }).success).toBe(false);
    const tooMany = Array.from({ length: MAX_COLLECTION_OUTFITS_PER_REQUEST + 1 }, () => ID);
    expect(collectionOutfitsRequestSchema.safeParse({ outfitIds: tooMany }).success).toBe(false);
  });
});
