import { z } from 'zod';
import { objectIdSchema } from '../object-id-schema';
import { eyebrowSchema, gridColumnsSchema, MAX_SECTION_COLLECTIONS, positiveCountSchema, sectionPropsShape } from './section-common-schemas';

export const collectionTilesSectionSchema = z.object({
  type: z.literal('CollectionTiles'),
  props: z.object({
    ...sectionPropsShape,
    eyebrow: eyebrowSchema,
    title: z.string().min(1).max(60),
    mode: z.enum(['auto', 'manual']),
    collectionIds: z.array(objectIdSchema).max(MAX_SECTION_COLLECTIONS),
    count: positiveCountSchema,
    columnsDesktop: gridColumnsSchema,
    showViewAll: z.boolean(),
  }),
});

export type CollectionTilesSection = z.infer<typeof collectionTilesSectionSchema>;
