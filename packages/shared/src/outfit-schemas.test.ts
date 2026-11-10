import { describe, expect, it } from 'vitest';
import { samplePublicOutfit } from './fixtures';
import { anchorSchema, outfitInputSchema, outfitItemSchema, outfitUpdateSchema, type OutfitInput } from './outfit-schemas';
import { publicOutfitSchema, toPublicOutfitDto } from './public-outfit-dto';

const image = { key: 'public/models/a.webp', width: 800, height: 1200 };

const makeItem = (overrides: Record<string, unknown> = {}) => ({
  id: 'item-1',
  name: 'Ao thun',
  image,
  side: 'left',
  order: 0,
  anchor: { x: 10, y: 20 },
  affiliateUrl: 'https://example.com/a',
  ...overrides,
});

const makeOutfit = (overrides: Record<string, unknown> = {}) => ({
  slug: 'dramatic-liberty',
  title: 'Dramatic Liberty',
  modelImage: image,
  status: 'draft',
  featured: false,
  items: [makeItem()],
  ...overrides,
});

describe('anchorSchema', () => {
  it('rejects coordinates outside 0..100', () => {
    expect(anchorSchema.safeParse({ x: 101, y: 5 }).success).toBe(false);
    expect(anchorSchema.safeParse({ x: 5, y: -1 }).success).toBe(false);
    expect(anchorSchema.safeParse({ x: 0, y: 100 }).success).toBe(true);
  });
});

describe('outfitItemSchema affiliateUrl', () => {
  it.each(['http://example.com/a', 'javascript:alert(1)', 'ftp://example.com', 'not a url', '//example.com'])(
    'rejects %s',
    (url) => {
      expect(outfitItemSchema.safeParse(makeItem({ affiliateUrl: url })).success).toBe(false);
    },
  );

  it.each(['', 'https://example.com/a?x=1'])('accepts %j', (url) => {
    expect(outfitItemSchema.safeParse(makeItem({ affiliateUrl: url })).success).toBe(true);
  });
});

describe('outfitInputSchema', () => {
  it('accepts a valid draft with empty links and no anchor', () => {
    const result = outfitInputSchema.safeParse(
      makeOutfit({ items: [makeItem({ affiliateUrl: '', anchor: undefined })] }),
    );
    expect(result.success).toBe(true);
  });

  it.each(['featured', 'slugs', 'feed'])('rejects the reserved slug %j', (slug) => {
    expect(outfitInputSchema.safeParse(makeOutfit({ slug })).success).toBe(false);
  });

  it.each(['Bad Slug', 'ao--thun', '-ao', 'ao-', 'áo-thun', ''])('rejects slug %j', (slug) => {
    expect(outfitInputSchema.safeParse(makeOutfit({ slug })).success).toBe(false);
  });

  it('rejects more than 30 items', () => {
    const items = Array.from({ length: 31 }, (_, i) => makeItem({ id: `i${i}` }));
    expect(outfitInputSchema.safeParse(makeOutfit({ items })).success).toBe(false);
  });

  it('rejects anchor above 100 inside an item', () => {
    const result = outfitInputSchema.safeParse(makeOutfit({ items: [makeItem({ anchor: { x: 120, y: 5 } })] }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['items', 0, 'anchor', 'x']);
  });

  it('blocks publishing when an item has no link and reports the item path', () => {
    const result = outfitInputSchema.safeParse(
      makeOutfit({ status: 'published', items: [makeItem(), makeItem({ id: 'item-2', affiliateUrl: '' })] }),
    );
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path.join('.'))).toEqual(['items.1.affiliateUrl']);
  });

  it('blocks publishing when an item has no anchor', () => {
    const result = outfitInputSchema.safeParse(
      makeOutfit({ status: 'published', items: [makeItem({ anchor: undefined })] }),
    );
    expect(result.error?.issues.map((i) => i.path.join('.'))).toEqual(['items.0.anchor']);
  });

  it('allows publishing when every item has link and anchor', () => {
    expect(outfitInputSchema.safeParse(makeOutfit({ status: 'published' })).success).toBe(true);
  });

  it('flags duplicate item ids', () => {
    const result = outfitInputSchema.safeParse(makeOutfit({ items: [makeItem(), makeItem()] }));
    expect(result.error?.issues[0]?.path).toEqual(['items', 1, 'id']);
  });
});

describe('outfitUpdateSchema', () => {
  it('strips a stale featured flag instead of rejecting the request', () => {
    const result = outfitUpdateSchema.safeParse(makeOutfit({ featured: true }));
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty('featured');
  });

  it('accepts a body without featured and applies the same publish rules', () => {
    const { featured: _featured, ...body } = makeOutfit();
    expect(outfitUpdateSchema.safeParse(body).success).toBe(true);
    const published = outfitUpdateSchema.safeParse({ ...body, status: 'published', items: [makeItem({ affiliateUrl: '' })] });
    expect(published.error?.issues[0]?.path).toEqual(['items', 0, 'affiliateUrl']);
  });
});

describe('public outfit dto', () => {
  it('fixture validates against the public schema', () => {
    expect(publicOutfitSchema.safeParse(samplePublicOutfit).success).toBe(true);
  });

  it('sorts items by side then order and resolves media urls', () => {
    const input = outfitInputSchema.parse(
      makeOutfit({
        status: 'published',
        items: [
          makeItem({ id: 'r1', side: 'right', order: 0 }),
          makeItem({ id: 'l2', side: 'left', order: 1 }),
          makeItem({ id: 'l1', side: 'left', order: 0 }),
        ],
      }),
    ) as OutfitInput;
    const dto = toPublicOutfitDto(
      { ...input, id: 'o1', createdAt: '2026-01-01', updatedAt: '2026-01-02' },
      (key) => `https://m.test/${key}`,
    );
    expect(dto.items.map((i) => i.id)).toEqual(['l1', 'l2', 'r1']);
    expect(dto.modelImage.url).toBe('https://m.test/public/models/a.webp');
    expect(publicOutfitSchema.safeParse(dto).success).toBe(true);
  });
});

describe('outfit collectionIds', () => {
  const ID_A = '64b7f0c2a1b2c3d4e5f60701';
  const ID_B = '64b7f0c2a1b2c3d4e5f60702';

  it('is optional and accepts unique object ids', () => {
    expect(outfitInputSchema.safeParse(makeOutfit()).success).toBe(true);
    expect(outfitInputSchema.safeParse(makeOutfit({ collectionIds: [ID_A, ID_B] })).success).toBe(true);
    expect(outfitUpdateSchema.safeParse(makeOutfit({ collectionIds: [] })).success).toBe(true);
  });

  it.each([
    ['not an object id', ['nope']],
    ['duplicates', [ID_A, ID_A]],
    ['more than 24', Array.from({ length: 25 }, (_, i) => `64b7f0c2a1b2c3d4e5f6${String(i).padStart(4, '0')}`)],
  ])('rejects %s', (_name, collectionIds) => {
    expect(outfitInputSchema.safeParse(makeOutfit({ collectionIds })).success).toBe(false);
    expect(outfitUpdateSchema.safeParse(makeOutfit({ collectionIds })).success).toBe(false);
  });

  it('stays absent from the parsed update when the client omits it', () => {
    const parsed = outfitUpdateSchema.parse(makeOutfit());
    expect('collectionIds' in parsed).toBe(false);
  });
});
