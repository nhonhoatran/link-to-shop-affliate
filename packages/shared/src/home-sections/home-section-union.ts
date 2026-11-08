import { z } from 'zod';
import { campaignBannerSectionSchema } from './campaign-banner-section';
import { collectionTilesSectionSchema } from './collection-tiles-section';
import { commitmentsSectionSchema } from './commitments-section';
import { faqSectionSchema } from './faq-section';
import { featuredLookbookSectionSchema } from './featured-lookbook-section';
import { gallerySectionSchema } from './gallery-section';
import { heroSliderSectionSchema } from './hero-slider-section';
import { marqueeSectionSchema } from './marquee-section';
import { newsletterSignupSectionSchema } from './newsletter-signup-section';
import { outfitListSectionSchema } from './outfit-list-section';
import { MAX_HOME_SECTIONS } from './section-common-schemas';
import { textWithImageSectionSchema } from './text-with-image-section';

export const homeSectionSchema = z.discriminatedUnion('type', [
  heroSliderSectionSchema,
  collectionTilesSectionSchema,
  outfitListSectionSchema,
  featuredLookbookSectionSchema,
  textWithImageSectionSchema,
  faqSectionSchema,
  commitmentsSectionSchema,
  campaignBannerSectionSchema,
  marqueeSectionSchema,
  gallerySectionSchema,
  newsletterSignupSectionSchema,
]);

export type HomeSection = z.infer<typeof homeSectionSchema>;
export type HomeSectionType = HomeSection['type'];
export type HomeSectionOf<T extends HomeSectionType> = Extract<HomeSection, { type: T }>;

export const HOME_SECTION_TYPES = [
  'HeroSlider',
  'CollectionTiles',
  'OutfitList',
  'FeaturedLookbook',
  'TextWithImage',
  'Faq',
  'Commitments',
  'CampaignBanner',
  'Marquee',
  'Gallery',
  'NewsletterSignup',
] as const satisfies readonly HomeSectionType[];

export const homeLayoutContentSchema = z
  .array(homeSectionSchema)
  .max(MAX_HOME_SECTIONS)
  .superRefine((sections, ctx) => {
    const seen = new Set<string>();
    sections.forEach((section, index) => {
      if (seen.has(section.props.id)) {
        ctx.addIssue({ code: 'custom', path: [index, 'props', 'id'], message: 'Duplicate section id' });
      }
      seen.add(section.props.id);
    });
  });

export type HomeLayoutContent = z.infer<typeof homeLayoutContentSchema>;
