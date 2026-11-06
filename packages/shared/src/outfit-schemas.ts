import { z } from 'zod';

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const MAX_ITEMS_PER_OUTFIT = 30;

export const anchorSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
});

export const imageRefSchema = z.object({
  key: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const imageWithUrlSchema = imageRefSchema.extend({ url: z.string().min(1) });

export const slugSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(SLUG_PATTERN, 'Slug must be lowercase letters, digits and single hyphens');

const isHttpsUrl = (value: string): boolean => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

export const affiliateUrlSchema = z.union([
  z.literal(''),
  z.string().max(2048).refine(isHttpsUrl, 'Link must be a valid https:// URL'),
]);

export const outfitItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  subtitle: z.string().max(80).optional(),
  description: z.string().max(240).optional(),
  image: imageRefSchema,
  side: z.enum(['left', 'right']),
  order: z.number().int().min(0),
  // Optional while drafting; required once the outfit is published.
  anchor: anchorSchema.optional(),
  affiliateUrl: affiliateUrlSchema,
});

export const outfitStatusSchema = z.enum(['draft', 'published']);

const outfitBaseSchema = z.object({
  slug: slugSchema,
  title: z.string().min(1).max(120),
  seoDescription: z.string().max(300).optional(),
  modelImage: imageRefSchema,
  status: outfitStatusSchema,
  featured: z.boolean(),
  items: z.array(outfitItemSchema).max(MAX_ITEMS_PER_OUTFIT),
});

type PublishCheckInput = Pick<z.infer<typeof outfitBaseSchema>, 'status' | 'items'>;

const checkPublishable = (outfit: PublishCheckInput, ctx: z.RefinementCtx): void => {
  const seen = new Set<string>();
  outfit.items.forEach((item, index) => {
    if (seen.has(item.id)) {
      ctx.addIssue({ code: 'custom', path: ['items', index, 'id'], message: 'Duplicate item id' });
    }
    seen.add(item.id);
    if (outfit.status !== 'published') return;
    if (item.affiliateUrl === '') {
      ctx.addIssue({
        code: 'custom',
        path: ['items', index, 'affiliateUrl'],
        message: 'A published outfit needs an affiliate link on every item',
      });
    }
    if (!item.anchor) {
      ctx.addIssue({
        code: 'custom',
        path: ['items', index, 'anchor'],
        message: 'A published outfit needs an anchor point on every item',
      });
    }
  });
};

export const outfitInputSchema = outfitBaseSchema.superRefine(checkPublishable);

// PUT body: no `featured` (only the featured endpoint changes it). z.object strips unknown keys by default,
// so clients that still send the field are accepted and the value is dropped.
export const outfitUpdateSchema = outfitBaseSchema.omit({ featured: true }).superRefine(checkPublishable);

export const outfitSchema = outfitBaseSchema
  .extend({
    id: z.string().min(1),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .superRefine(checkPublishable);

export type Anchor = z.infer<typeof anchorSchema>;
export type ImageRef = z.infer<typeof imageRefSchema>;
export type ImageWithUrl = z.infer<typeof imageWithUrlSchema>;
export type OutfitItem = z.infer<typeof outfitItemSchema>;
export type OutfitStatus = z.infer<typeof outfitStatusSchema>;
export type OutfitInput = z.infer<typeof outfitInputSchema>;
export type OutfitUpdateInput = z.infer<typeof outfitUpdateSchema>;
export type Outfit = z.infer<typeof outfitSchema>;
