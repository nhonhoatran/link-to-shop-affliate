import { cache } from 'react';
import { API_PATHS, PUBLIC_CACHE_TAGS, type PublicHomeResponse } from '@under30ss/shared';
import { apiGet } from '@/lib/api-client-server';
import { safetyRevalidate } from './public-data-loaders';

/** The API returns the published layout, or the built-in default when nothing was published. */
export const getHomePage = cache(() =>
  apiGet<PublicHomeResponse>(API_PATHS.public.home, { ...safetyRevalidate(), tags: [PUBLIC_CACHE_TAGS.home] }),
);
