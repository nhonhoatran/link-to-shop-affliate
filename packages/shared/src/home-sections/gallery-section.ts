import { z } from 'zod';
import { objectIdSchema } from '../object-id-schema';
import { eyebrowSchema, MAX_GALLERY_ITEMS, positiveCountSchema, sectionPropsShape } from './section-common-schemas';

export const gallerySectionSchema = z.object({
  type: z.literal('Gallery'),
  props: z.object({
    ...sectionPropsShape,
    eyebrow: eyebrowSchema,
    title: z.string().min(1).max(60),
    note: z.string().max(120).optional(),
    source: z.enum(['latest', 'collection', 'manual']),
    collectionIds: z.array(objectIdSchema).max(1),
    outfitIds: z.array(objectIdSchema).max(MAX_GALLERY_ITEMS),
    count: positiveCountSchema.max(MAX_GALLERY_ITEMS),
  }),
});

export type GallerySection = z.infer<typeof gallerySectionSchema>;
