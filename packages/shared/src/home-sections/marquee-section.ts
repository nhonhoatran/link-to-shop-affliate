import { z } from 'zod';
import { MAX_MARQUEE_ITEMS, MAX_MARQUEE_SECONDS, MIN_MARQUEE_SECONDS, sectionPropsShape } from './section-common-schemas';

export const marqueeItemSchema = z.object({ text: z.string().min(1).max(40) });

export const marqueeSectionSchema = z.object({
  type: z.literal('Marquee'),
  props: z.object({
    ...sectionPropsShape,
    // Accessible name of the region; the visible text is the items.
    label: z.string().max(60).optional(),
    items: z.array(marqueeItemSchema).min(1).max(MAX_MARQUEE_ITEMS),
    durationSeconds: z.number().int().min(MIN_MARQUEE_SECONDS).max(MAX_MARQUEE_SECONDS),
  }),
});

export type MarqueeItem = z.infer<typeof marqueeItemSchema>;
export type MarqueeSection = z.infer<typeof marqueeSectionSchema>;
