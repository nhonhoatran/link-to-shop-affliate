import { z } from 'zod';
import { anchorSchema, imageWithUrlSchema, outfitItemSchema, type Outfit } from './outfit-schemas';

export const publicOutfitItemSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  image: imageWithUrlSchema,
  side: outfitItemSchema.shape.side,
  order: z.number().int().min(0),
  anchor: anchorSchema,
  affiliateUrl: z.string(),
});

export const publicOutfitSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  seoDescription: z.string().optional(),
  modelImage: imageWithUrlSchema,
  updatedAt: z.string(),
  items: z.array(publicOutfitItemSchema),
});

export type PublicOutfitItemDto = z.infer<typeof publicOutfitItemSchema>;
export type PublicOutfitDto = z.infer<typeof publicOutfitSchema>;

export const OUTFIT_SIDE_ORDER = { left: 0, right: 1 } as const;

export const compareOutfitItems = (
  a: Pick<PublicOutfitItemDto, 'side' | 'order'>,
  b: Pick<PublicOutfitItemDto, 'side' | 'order'>,
): number => OUTFIT_SIDE_ORDER[a.side] - OUTFIT_SIDE_ORDER[b.side] || a.order - b.order;

export const buildMediaUrl = (baseUrl: string, key: string): string =>
  `${baseUrl.replace(/\/+$/, '')}/${key.replace(/^\/+/, '')}`;

/** Items without an anchor are dropped: they cannot be drawn on the lookbook. */
export const toPublicOutfitDto = (outfit: Outfit, resolveUrl: (key: string) => string): PublicOutfitDto => {
  const items = outfit.items.flatMap((item) =>
    item.anchor
      ? [{ ...item, anchor: item.anchor, image: { ...item.image, url: resolveUrl(item.image.key) } }]
      : [],
  );
  items.sort(compareOutfitItems);
  return {
    id: outfit.id,
    slug: outfit.slug,
    title: outfit.title,
    ...(outfit.seoDescription ? { seoDescription: outfit.seoDescription } : {}),
    modelImage: { ...outfit.modelImage, url: resolveUrl(outfit.modelImage.key) },
    updatedAt: outfit.updatedAt,
    items,
  };
};
