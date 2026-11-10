import { cache } from 'react';
import {
  API_PATHS,
  apiUrl,
  PUBLIC_SETTINGS_CACHE_TAG,
  RESERVED_OUTFIT_SLUGS,
  type FeaturedOutfitResponse,
  type OutfitSlugsResponse,
  type PublicOutfitCardDto,
  type PublicOutfitListResponse,
  type PublicOutfitResponse,
  type PublicSettingsResponse,
} from '@under30ss/shared';
import { ApiError, apiGet } from '@/lib/api-client-server';
import { getWebEnv } from '@/lib/web-env';

/**
 * Safety net only: pages are refreshed on demand through /api/revalidate (revalidatePath);
 * this bounds staleness if that call is ever lost. Set with PUBLIC_REVALIDATE_SECONDS.
 */
export const safetyRevalidate = () => ({ revalidate: getWebEnv().PUBLIC_REVALIDATE_SECONDS });

/** Returns null only for an API 404; every other failure propagates to the error boundary. */
export const nullOnNotFound = async <T>(request: Promise<T>): Promise<T | null> => {
  try {
    return await request;
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null;
    throw error;
  }
};

export const getPublicSettings = cache(() =>
  apiGet<PublicSettingsResponse>(API_PATHS.public.settings, { ...safetyRevalidate(), tags: [PUBLIC_SETTINGS_CACHE_TAG] }),
);

// Reserved slugs are API routes (feed, featured, slugs), never outfits.
export const getOutfitBySlug = cache(async (slug: string) =>
  RESERVED_OUTFIT_SLUGS.includes(slug)
    ? null
    : nullOnNotFound(apiGet<PublicOutfitResponse>(apiUrl.publicOutfit(slug), safetyRevalidate())),
);

export const getFeaturedOutfit = cache(() =>
  nullOnNotFound(apiGet<FeaturedOutfitResponse>(API_PATHS.public.featuredOutfit, safetyRevalidate())),
);

export const getOutfitSlugs = () => apiGet<OutfitSlugsResponse>(API_PATHS.public.outfitSlugs);

/** `size` omitted: the API applies the page size configured in settings. */
export const getPublicOutfitPage = cache((page: number, size?: number) => {
  const query = new URLSearchParams({ page: String(page), ...(size === undefined ? {} : { size: String(size) }) });
  return apiGet<PublicOutfitListResponse>(`${API_PATHS.public.outfits}?${query}`, safetyRevalidate());
});

/** Newest outfits except the current one; asks for one extra so the exclusion never leaves the list short. */
export const getRelatedOutfits = async (excludeSlug: string, count: number): Promise<PublicOutfitCardDto[]> => {
  const { items } = await getPublicOutfitPage(1, count + 1);
  return items.filter((outfit) => outfit.slug !== excludeSlug).slice(0, count);
};
