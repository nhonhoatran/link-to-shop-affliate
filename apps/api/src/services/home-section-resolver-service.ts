import type { HomeLayoutContent, HomeSection, NewsletterConsentDto, PublicOutfitDto, ResolvedHomeSection } from '@under30ss/shared';
import type { Env } from '../config/env-config';
import { attachSectionImageUrls } from './home-section-image-mapper';
import { resolveCollectionTiles } from './home-section-collection-tiles-resolver';
import { isLatestGallery, resolveGallery } from './home-section-gallery-resolver';
import { resolveOutfitList } from './home-section-outfit-list-resolver';
import type { ResolveContext } from './home-section-resolve-context';
import { createMediaUrlResolver } from './outfit-mapper';
import { getFeaturedOutfit, getPublishedOutfitById } from './public-outfit-service';
import { getListingSettings } from './settings-service';
import { getSavedConsent } from './settings-newsletter-consent-service';

const resolveFeaturedLookbook = async (
  section: Extract<HomeSection, { type: 'FeaturedLookbook' }>,
  ctx: ResolveContext,
): Promise<ResolvedHomeSection | null> => {
  const { source, outfitId } = section.props;
  const outfit: PublicOutfitDto | null =
    source === 'manual' ? (outfitId ? await getPublishedOutfitById(outfitId, ctx.env) : null) : await ctx.featured();
  return outfit ? { ...section, data: { outfit } } : null;
};

const resolveNewsletterSignup = async (
  section: Extract<HomeSection, { type: 'NewsletterSignup' }>,
  ctx: ResolveContext,
): Promise<ResolvedHomeSection | null> => {
  const consent = await ctx.consent();
  return consent ? { ...section, data: { consent } } : null;
};

// Galleries with the `latest` source are resolved in a second pass (see resolveHomeSections).
const resolveSection = async (section: HomeSection, ctx: ResolveContext): Promise<ResolvedHomeSection | null> => {
  switch (section.type) {
    case 'HeroSlider':
      return section.props.slides.length > 0
        ? (attachSectionImageUrls(section, ctx.resolveUrl) as ResolvedHomeSection)
        : null;
    case 'TextWithImage':
    case 'CampaignBanner':
      return attachSectionImageUrls(section, ctx.resolveUrl) as ResolvedHomeSection;
    case 'Faq':
    case 'Commitments':
    case 'Marquee':
      return section.props.items.length > 0 ? section : null;
    case 'CollectionTiles':
      return resolveCollectionTiles(section, ctx);
    case 'OutfitList':
      return resolveOutfitList(section, ctx);
    case 'Gallery':
      return resolveGallery(section, ctx);
    case 'NewsletterSignup':
      return resolveNewsletterSignup(section, ctx);
    case 'FeaturedLookbook':
      return resolveFeaturedLookbook(section, ctx);
  }
};

const shownOutfitSlugs = (resolved: (ResolvedHomeSection | null)[]): Set<string> => {
  const slugs = new Set<string>();
  for (const section of resolved) {
    if (section?.type === 'FeaturedLookbook') slugs.add(section.data.outfit.slug);
    if (section?.type !== 'OutfitList') continue;
    for (const tab of section.data.tabs) for (const item of tab.items) slugs.add(item.slug);
  }
  return slugs;
};

/** Hidden sections and sections with nothing to show are dropped, so the page never renders an empty block. */
export const resolveHomeSections = async (content: HomeLayoutContent, env: Env): Promise<ResolvedHomeSection[]> => {
  const visible = content.filter((section) => section.props.visible);
  if (visible.length === 0) return [];
  const listing = await getListingSettings(env);
  // Shared by every section that needs it, fetched at most once per request.
  let featured: Promise<PublicOutfitDto | null> | undefined;
  let consent: Promise<NewsletterConsentDto | null> | undefined;
  const ctx: ResolveContext = {
    env,
    listing,
    resolveUrl: createMediaUrlResolver(env),
    featured: () => (featured ??= getFeaturedOutfit(env)),
    consent: () => (consent ??= getSavedConsent()),
  };
  const resolved = await Promise.all(visible.map((section) => (isLatestGallery(section) ? null : resolveSection(section, ctx))));
  // A `latest` gallery must not repeat outfits an outfit list or the featured lookbook already shows on the same page.
  const exclude = shownOutfitSlugs(resolved);
  const complete = await Promise.all(
    visible.map((section, index) => (isLatestGallery(section) ? resolveGallery(section, ctx, exclude) : resolved[index] ?? null)),
  );
  return complete.filter((section): section is ResolvedHomeSection => section !== null);
};
