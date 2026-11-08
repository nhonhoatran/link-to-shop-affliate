import type { HomeLayoutContent, HomeSection, PublicOutfitDto, ResolvedHomeSection } from '@under30ss/shared';
import type { Env } from '../config/env-config';
import { attachSectionImageUrls } from './home-section-image-mapper';
import { resolveCollectionTiles } from './home-section-collection-tiles-resolver';
import { resolveOutfitList } from './home-section-outfit-list-resolver';
import type { ResolveContext } from './home-section-resolve-context';
import { createMediaUrlResolver } from './outfit-mapper';
import { getFeaturedOutfit, getPublishedOutfitById } from './public-outfit-service';
import { getListingSettings } from './settings-service';

const resolveFeaturedLookbook = async (
  section: Extract<HomeSection, { type: 'FeaturedLookbook' }>,
  ctx: ResolveContext,
): Promise<ResolvedHomeSection | null> => {
  const { source, outfitId } = section.props;
  const outfit: PublicOutfitDto | null =
    source === 'manual' ? (outfitId ? await getPublishedOutfitById(outfitId, ctx.env) : null) : await ctx.featured();
  return outfit ? { ...section, data: { outfit } } : null;
};

const resolveSection = async (section: HomeSection, ctx: ResolveContext): Promise<ResolvedHomeSection | null> => {
  switch (section.type) {
    case 'HeroSlider':
      return section.props.slides.length > 0
        ? (attachSectionImageUrls(section, ctx.resolveUrl) as ResolvedHomeSection)
        : null;
    case 'TextWithImage':
      return attachSectionImageUrls(section, ctx.resolveUrl) as ResolvedHomeSection;
    case 'Faq':
    case 'Commitments':
      return section.props.items.length > 0 ? section : null;
    case 'CollectionTiles':
      return resolveCollectionTiles(section, ctx);
    case 'OutfitList':
      return resolveOutfitList(section, ctx);
    case 'FeaturedLookbook':
      return resolveFeaturedLookbook(section, ctx);
  }
};

/** Hidden sections and sections with nothing to show are dropped, so the page never renders an empty block. */
export const resolveHomeSections = async (content: HomeLayoutContent, env: Env): Promise<ResolvedHomeSection[]> => {
  const visible = content.filter((section) => section.props.visible);
  if (visible.length === 0) return [];
  const listing = await getListingSettings(env);
  // Shared by every section that needs it, fetched at most once per request.
  let featured: Promise<PublicOutfitDto | null> | undefined;
  const ctx: ResolveContext = {
    env,
    listing,
    resolveUrl: createMediaUrlResolver(env),
    featured: () => (featured ??= getFeaturedOutfit(env)),
  };
  const resolved = await Promise.all(visible.map((section) => resolveSection(section, ctx)));
  return resolved.filter((section): section is ResolvedHomeSection => section !== null);
};
