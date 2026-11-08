import { z } from 'zod';
import { safeHrefSchema } from '../safe-href';
import { eyebrowSchema, sectionImageSchema, sectionPropsShape } from './section-common-schemas';

export const campaignBannerSectionSchema = z.object({
  type: z.literal('CampaignBanner'),
  props: z.object({
    ...sectionPropsShape,
    eyebrow: eyebrowSchema,
    heading: z.string().min(1).max(80),
    // Plain text; never rendered as HTML.
    body: z.string().max(400).optional(),
    image: sectionImageSchema,
    alt: z.string().max(160),
    imagePosition: z.enum(['left', 'right']),
    ctaLabel: z.string().max(30).optional(),
    ctaHref: safeHrefSchema.optional(),
  }),
});

export type CampaignBannerSection = z.infer<typeof campaignBannerSectionSchema>;
