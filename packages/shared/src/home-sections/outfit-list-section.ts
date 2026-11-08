import { z } from 'zod';
import { objectIdSchema } from '../object-id-schema';
import {
  gridColumnsSchema,
  MAX_OUTFIT_LIST_TABS,
  MAX_SECTION_OUTFITS,
  positiveCountSchema,
  sectionPropsShape,
} from './section-common-schemas';

export const outfitListSectionSchema = z.object({
  type: z.literal('OutfitList'),
  props: z.object({
    ...sectionPropsShape,
    title: z.string().min(1).max(60),
    source: z.enum(['latest', 'collection', 'manual']),
    // More than one collection renders as tabs.
    collectionIds: z.array(objectIdSchema).max(MAX_OUTFIT_LIST_TABS),
    outfitIds: z.array(objectIdSchema).max(MAX_SECTION_OUTFITS),
    // Absent = the `relatedOutfitsCount` setting. The upper bound (PUBLIC_PAGE_SIZE_MAX) is checked by the API.
    count: positiveCountSchema.optional(),
    display: z.enum(['carousel', 'grid']),
    columnsDesktop: gridColumnsSchema,
    excludeFeatured: z.boolean(),
    showViewAll: z.boolean(),
  }),
});

export type OutfitListSection = z.infer<typeof outfitListSectionSchema>;
