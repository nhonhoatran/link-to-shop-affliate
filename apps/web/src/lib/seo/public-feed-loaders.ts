import { cache } from 'react';
import { API_PATHS, PUBLIC_CACHE_TAGS, type PublicOutfitFeedResponse } from '@under30ss/shared';
import { apiGet } from '@/lib/api-client-server';
import { nullOnNotFound, safetyRevalidate } from './public-data-loaders';

const feedQuery = (page: number, size?: number, collection?: string): string => {
  const query = new URLSearchParams({ page: String(page) });
  if (size !== undefined) query.set('size', String(size));
  if (collection) query.set('collection', collection);
  return query.toString();
};

/**
 * Full lookbooks, featured first. `size` omitted: the API applies the page size configured in settings.
 * Null for an unknown or draft collection (API 404); other failures propagate.
 */
export const getOutfitFeedPage = cache((page: number, size?: number, collection?: string) =>
  nullOnNotFound(
    apiGet<PublicOutfitFeedResponse>(`${API_PATHS.public.outfitFeed}?${feedQuery(page, size, collection)}`, {
      ...safetyRevalidate(),
      tags: [PUBLIC_CACHE_TAGS.home, PUBLIC_CACHE_TAGS.collections],
    }),
  ),
);

/** Next batch number, or null once every outfit has been served. */
export const nextFeedPage = ({ page, size, total }: { page: number; size: number; total: number }): number | null =>
  page * size < total ? page + 1 : null;
