import { cache } from 'react';
import {
  API_PATHS,
  apiUrl,
  type FeaturedOutfitResponse,
  type OutfitSlugsResponse,
  type PublicOutfitResponse,
  type PublicSettingsResponse,
} from '@under30ss/shared';
import { ApiError, apiGet } from '@/lib/api-client-server';
import { getWebEnv } from '@/lib/web-env';

/**
 * Safety net only: pages are refreshed on demand through /api/revalidate (revalidatePath);
 * this bounds staleness if that call is ever lost. Set with PUBLIC_REVALIDATE_SECONDS.
 */
const safetyRevalidate = () => ({ revalidate: getWebEnv().PUBLIC_REVALIDATE_SECONDS });

/** Returns null only for an API 404; every other failure propagates to the error boundary. */
const nullOnNotFound = async <T>(request: Promise<T>): Promise<T | null> => {
  try {
    return await request;
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null;
    throw error;
  }
};

export const getPublicSettings = cache(() => apiGet<PublicSettingsResponse>(API_PATHS.public.settings, safetyRevalidate()));

export const getOutfitBySlug = cache((slug: string) =>
  nullOnNotFound(apiGet<PublicOutfitResponse>(apiUrl.publicOutfit(slug), safetyRevalidate())),
);

export const getFeaturedOutfit = cache(() =>
  nullOnNotFound(apiGet<FeaturedOutfitResponse>(API_PATHS.public.featuredOutfit, safetyRevalidate())),
);

export const getOutfitSlugs = () => apiGet<OutfitSlugsResponse>(API_PATHS.public.outfitSlugs);
