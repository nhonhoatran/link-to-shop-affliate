import { z } from 'zod';
import type { PublicCollectionCardDto } from './collection-contract';
import { homeLayoutContentSchema, type HomeSection, type HomeSectionOf } from './home-sections';
import type { NewsletterConsentDto } from './newsletter-contract';
import type { PublicOutfitDto } from './public-outfit-dto';
import type { PublicOutfitCardDto } from './public-outfit-list-contract';

// Stored with each layout document so stored content can be migrated if the section schemas change.
export const HOME_LAYOUT_SCHEMA_VERSION = 1;

// `baseUpdatedAt` / `basePublishedAt` implement optimistic locking; null means "nothing saved / published yet".
export const saveHomeDraftRequestSchema = z.object({
  content: homeLayoutContentSchema,
  baseUpdatedAt: z.string().nullable(),
});
export type SaveHomeDraftRequest = z.infer<typeof saveHomeDraftRequestSchema>;

export const previewHomeRequestSchema = z.object({ content: homeLayoutContentSchema });
export type PreviewHomeRequest = z.infer<typeof previewHomeRequestSchema>;

export const publishHomeRequestSchema = z.object({ baseUpdatedAt: z.string().nullable() });
export type PublishHomeRequest = z.infer<typeof publishHomeRequestSchema>;

// The key is required (a missing key is a validation error), its value may be null.
export const restorePreviousHomeRequestSchema = z.object({ basePublishedAt: z.string().nullable() });
export type RestorePreviousHomeRequest = z.infer<typeof restorePreviousHomeRequestSchema>;

/** null: nothing to undo. `publishedAt: null`: the previous layout was the built-in default. */
export type HomePreviousInfo = { publishedAt: string | null } | null;

export interface PublishHomeResponse {
  publishedAt: string;
  previous: HomePreviousInfo;
}

export interface RestorePreviousHomeResponse {
  publishedAt: string | null;
  previous: HomePreviousInfo;
}

export interface AdminHomeLayoutDto {
  draft: HomeSection[];
  draftUpdatedAt: string | null;
  publishedAt: string | null;
  previous: HomePreviousInfo;
  hasUnpublishedChanges: boolean;
  usingDefault: boolean;
}

export interface OutfitListTabData {
  key: string;
  label?: string;
  href?: string;
  items: PublicOutfitCardDto[];
}

export type ResolvedHomeSection =
  | HomeSectionOf<'HeroSlider'>
  | HomeSectionOf<'TextWithImage'>
  | HomeSectionOf<'Faq'>
  | HomeSectionOf<'Commitments'>
  | HomeSectionOf<'CampaignBanner'>
  | HomeSectionOf<'Marquee'>
  | (HomeSectionOf<'CollectionTiles'> & { data: { items: PublicCollectionCardDto[] } })
  | (HomeSectionOf<'OutfitList'> & { data: { tabs: OutfitListTabData[] } })
  | (HomeSectionOf<'FeaturedLookbook'> & { data: { outfit: PublicOutfitDto } })
  | (HomeSectionOf<'Gallery'> & { data: { items: PublicOutfitCardDto[] } })
  | (HomeSectionOf<'NewsletterSignup'> & { data: { consent: NewsletterConsentDto } });

/** Only visible sections that have data to show. */
export interface PublicHomeResponse {
  source: 'published' | 'default';
  sections: ResolvedHomeSection[];
}

export interface PreviewHomeResponse {
  sections: ResolvedHomeSection[];
}
