import { publicOutfitSchema, type PublicOutfitDto, type PublicOutfitItemDto } from '../public-outfit-dto';

const FIXTURE_MEDIA_BASE = 'https://media.example.test/public/fixtures';

const item = (
  id: string,
  name: string,
  subtitle: string,
  side: 'left' | 'right',
  order: number,
  anchor: { x: number; y: number },
  affiliateUrl: string,
): PublicOutfitItemDto => ({
  id,
  name,
  subtitle,
  description: `Mo ta ngan cho ${name.toLowerCase()}.`,
  image: { key: `public/fixtures/${id}.webp`, url: `${FIXTURE_MEDIA_BASE}/${id}.webp`, width: 600, height: 600 },
  side,
  order,
  anchor,
  affiliateUrl,
});

const draft: PublicOutfitDto = {
  id: 'fixture-outfit-1',
  slug: 'dramatic-liberty-streetwear',
  title: 'Dramatic Liberty streetwear',
  seoDescription: 'Outfit streetwear voi ao thun in chu, quan short jean rach va sneaker.',
  modelImage: {
    key: 'public/fixtures/model.webp',
    url: `${FIXTURE_MEDIA_BASE}/model.webp`,
    width: 900,
    height: 1500,
  },
  updatedAt: '2026-11-06T00:00:00.000Z',
  items: [
    item('tee', 'Ao thun in chu', 'Graphic t-shirt', 'left', 0, { x: 38, y: 28 }, 'https://example.com/aff/tee'),
    item('shorts', 'Quan short jean rach', 'Denim shorts', 'left', 1, { x: 40, y: 62 }, 'https://example.com/aff/shorts'),
    item('sneakers', 'Giay sneaker', 'Sneakers', 'left', 2, { x: 45, y: 92 }, 'https://example.com/aff/sneakers'),
    item('bag', 'Tui deo cheo', 'Crossbody bag', 'right', 0, { x: 62, y: 38 }, 'https://example.com/aff/bag'),
    item('necklace', 'Day chuyen bac', 'Necklace', 'right', 1, { x: 52, y: 26 }, 'https://example.com/aff/necklace'),
    item('belt', 'That lung da', 'Leather belt', 'right', 2, { x: 58, y: 56 }, 'https://example.com/aff/belt'),
  ],
};

export const samplePublicOutfit: PublicOutfitDto = publicOutfitSchema.parse(draft);
