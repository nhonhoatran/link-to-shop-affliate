import type { OutfitInput } from '@under30ss/shared';

const image = (name: string) => ({ key: `public/item/2026/11/${name}.webp`, width: 400, height: 400 });

export const buildOutfitPayload = (overrides: Partial<OutfitInput> = {}): OutfitInput => ({
  slug: 'sample-look',
  title: 'Sample look',
  seoDescription: 'A sample outfit',
  modelImage: { key: 'public/model/2026/11/model.webp', width: 1000, height: 1600 },
  status: 'draft',
  featured: false,
  items: [
    {
      id: 'item-1',
      name: 'Left jacket',
      image: image('jacket'),
      side: 'left',
      order: 1,
      anchor: { x: 30, y: 40 },
      affiliateUrl: 'https://shop.example.com/jacket',
    },
    {
      id: 'item-2',
      name: 'Right bag',
      image: image('bag'),
      side: 'right',
      order: 0,
      anchor: { x: 70, y: 60 },
      affiliateUrl: 'https://shop.example.com/bag',
    },
    {
      id: 'item-3',
      name: 'Left shoes',
      image: image('shoes'),
      side: 'left',
      order: 0,
      anchor: { x: 35, y: 90 },
      affiliateUrl: 'https://shop.example.com/shoes',
    },
  ],
  ...overrides,
});
