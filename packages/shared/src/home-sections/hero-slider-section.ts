import { z } from 'zod';
import { safeHrefSchema } from '../safe-href';
import { eyebrowSchema, sectionImageSchema, sectionPropsShape } from './section-common-schemas';

export const MAX_HERO_SLIDES = 10;
export const MIN_HERO_AUTOPLAY_SECONDS = 3;
export const MAX_HERO_AUTOPLAY_SECONDS = 30;

export const heroSlideSchema = z.object({
  image: sectionImageSchema,
  mobileImage: sectionImageSchema.optional(),
  eyebrow: eyebrowSchema,
  alt: z.string().max(160),
  heading: z.string().max(80).optional(),
  text: z.string().max(200).optional(),
  ctaLabel: z.string().max(30).optional(),
  ctaHref: safeHrefSchema.optional(),
});

// 0 turns autoplay off (WCAG 2.2.2: moving content must be stoppable).
const autoplaySecondsSchema = z
  .number()
  .int()
  .refine(
    (value) => value === 0 || (value >= MIN_HERO_AUTOPLAY_SECONDS && value <= MAX_HERO_AUTOPLAY_SECONDS),
    `Autoplay must be 0 or ${MIN_HERO_AUTOPLAY_SECONDS}-${MAX_HERO_AUTOPLAY_SECONDS} seconds`,
  );

export const heroSliderSectionSchema = z.object({
  type: z.literal('HeroSlider'),
  props: z.object({
    ...sectionPropsShape,
    label: z.string().max(60).optional(),
    slides: z.array(heroSlideSchema).min(1).max(MAX_HERO_SLIDES),
    autoplaySeconds: autoplaySecondsSchema,
  }),
});

export type HeroSlide = z.infer<typeof heroSlideSchema>;
export type HeroSliderSection = z.infer<typeof heroSliderSectionSchema>;
