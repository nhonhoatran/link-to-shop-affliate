import { z } from 'zod';
import { safeHrefSchema } from '../safe-href';
import { sectionImageSchema, sectionPropsShape } from './section-common-schemas';

export const textWithImageSectionSchema = z.object({
  type: z.literal('TextWithImage'),
  props: z.object({
    ...sectionPropsShape,
    heading: z.string().min(1).max(80),
    // Plain text; paragraphs are separated by blank lines. Never rendered as HTML.
    body: z.string().min(1).max(2000),
    image: sectionImageSchema.optional(),
    alt: z.string().max(160).optional(),
    imagePosition: z.enum(['left', 'right']),
    ctaLabel: z.string().max(30).optional(),
    ctaHref: safeHrefSchema.optional(),
  }),
});

export type TextWithImageSection = z.infer<typeof textWithImageSectionSchema>;
