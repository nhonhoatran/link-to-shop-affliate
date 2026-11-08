import type { PublicCollectionCardDto } from '../collection-contract';

const FIXTURE_MEDIA_BASE = 'https://media.example.test/public/fixtures';

const card = (slug: string, name: string, description?: string): PublicCollectionCardDto => ({
  slug,
  name,
  ...(description ? { description } : {}),
  coverImage: {
    key: `public/fixtures/collection-${slug}.webp`,
    url: `${FIXTURE_MEDIA_BASE}/collection-${slug}.webp`,
    width: 800,
    height: 1000,
  },
});

export const sampleCollectionCards: PublicCollectionCardDto[] = [
  card('streetwear', 'Streetwear', 'Phối đồ đường phố năng động.'),
  card('di-lam', 'Đi làm'),
  card('mua-he', 'Mùa hè', 'Nhẹ nhàng cho ngày nắng.'),
];

export const sampleCollectionIds = ['64b7f0c2a1b2c3d4e5f60701', '64b7f0c2a1b2c3d4e5f60702', '64b7f0c2a1b2c3d4e5f60703'] as const;
