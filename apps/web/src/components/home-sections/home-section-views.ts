import type { ComponentType } from 'react';
import type { HomeSectionType, ResolvedHomeSection } from '@under30ss/shared';
import { CampaignBannerView } from './campaign-banner-view';
import { CollectionTilesView } from './collection-tiles-view';
import { CommitmentsView } from './commitments-view';
import { FaqView } from './faq-view';
import { FeaturedLookbookView } from './featured-lookbook-view';
import { GalleryView } from './gallery-view';
import { HeroSliderView } from './hero-slider-view';
import { MarqueeView } from './marquee-view';
import { NewsletterSignupView } from './newsletter-signup-view';
import { OutfitListView } from './outfit-list-view';
import type { SectionViewProps } from './section-shell';
import { TextWithImageView } from './text-with-image-view';

export type ResolvedHomeSectionOf<T extends HomeSectionType> = Extract<ResolvedHomeSection, { type: T }>;

// Client-safe: the views take resolved data as props and never fetch, so the admin preview can reuse them.
export const HOME_SECTION_VIEWS: { [T in HomeSectionType]: ComponentType<SectionViewProps<ResolvedHomeSectionOf<T>>> } = {
  HeroSlider: HeroSliderView,
  CollectionTiles: CollectionTilesView,
  OutfitList: OutfitListView,
  FeaturedLookbook: FeaturedLookbookView,
  TextWithImage: TextWithImageView,
  Faq: FaqView,
  Commitments: CommitmentsView,
  CampaignBanner: CampaignBannerView,
  Marquee: MarqueeView,
  Gallery: GalleryView,
  NewsletterSignup: NewsletterSignupView,
};
