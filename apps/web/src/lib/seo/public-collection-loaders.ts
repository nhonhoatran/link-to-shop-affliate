import { cache } from 'react';
import {
  API_PATHS,
  apiUrl,
  PUBLIC_CACHE_TAGS,
  type CollectionSlugsResponse,
  type PublicCollectionListResponse,
  type PublicCollectionPageResponse,
} from '@under30ss/shared';
import { apiGet } from '@/lib/api-client-server';
import { nullOnNotFound, safetyRevalidate } from './public-data-loaders';

const cacheOptions = () => ({ ...safetyRevalidate(), tags: [PUBLIC_CACHE_TAGS.collections] });

/** `size` omitted: the API applies the page size configured in settings. */
const pageQuery = (page: number, size?: number): string =>
  new URLSearchParams({ page: String(page), ...(size === undefined ? {} : { size: String(size) }) }).toString();

export const getPublicCollectionPage = cache((page: number, size?: number) =>
  apiGet<PublicCollectionListResponse>(`${API_PATHS.public.collections}?${pageQuery(page, size)}`, cacheOptions()),
);

/** Null for an unknown or draft slug (API 404); other failures propagate. */
export const getCollectionPage = cache((slug: string, page: number, size?: number) =>
  nullOnNotFound(
    apiGet<PublicCollectionPageResponse>(`${apiUrl.publicCollection(slug)}?${pageQuery(page, size)}`, cacheOptions()),
  ),
);

export const getCollectionSlugs = () => apiGet<CollectionSlugsResponse>(API_PATHS.public.collectionSlugs);
