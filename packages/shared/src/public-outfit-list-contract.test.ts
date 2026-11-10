import { describe, expect, it } from 'vitest';
import { publicOutfitFeedQuerySchema } from './public-outfit-list-contract';

describe('publicOutfitFeedQuerySchema', () => {
  it('defaults the page and leaves collection unset', () => {
    expect(publicOutfitFeedQuerySchema.parse({})).toEqual({ page: 1 });
  });

  it('accepts a collection slug and coerces numbers from the query string', () => {
    expect(publicOutfitFeedQuerySchema.parse({ page: '2', size: '5', collection: 'streetwear' })).toEqual({
      page: 2,
      size: 5,
      collection: 'streetwear',
    });
  });

  it.each(['Bad Slug', 'slugs'])('rejects the collection %s', (collection) => {
    expect(publicOutfitFeedQuerySchema.safeParse({ collection }).success).toBe(false);
  });
});
