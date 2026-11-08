import { z } from 'zod';
import { objectIdSchema } from '../object-id-schema';
import { sectionPropsShape } from './section-common-schemas';

export const featuredLookbookSectionSchema = z.object({
  type: z.literal('FeaturedLookbook'),
  props: z.object({
    ...sectionPropsShape,
    source: z.enum(['featured', 'manual']),
    outfitId: objectIdSchema.optional(),
  }),
});

export type FeaturedLookbookSection = z.infer<typeof featuredLookbookSectionSchema>;
