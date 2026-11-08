import {
  COLLECTIONS_PAGE_PATH,
  LOOKS_PAGE_PATH,
  PUBLIC_CACHE_TAGS,
  REVALIDATE_SECRET_HEADER,
  revalidateRequestSchema,
  type PublicCacheTag,
  type RevalidateRequest,
} from '@under30ss/shared';
import type { Env } from '../config/env-config';
import type { Revalidate } from '../lib/app-context';

// Short on purpose: a slow web app must not stall admin writes.
const REVALIDATE_TIMEOUT_MS = 3000;
const MAX_PATHS = 50;

export const outfitPaths = (...slugs: (string | undefined)[]): string[] => [
  '/',
  LOOKS_PAGE_PATH,
  ...slugs.filter((slug): slug is string => Boolean(slug)).map((slug) => `/look/${slug}`),
  '/sitemap.xml',
];

export const collectionPaths = (...slugs: (string | undefined)[]): string[] => [
  '/',
  COLLECTIONS_PAGE_PATH,
  ...slugs.filter((slug): slug is string => Boolean(slug)).map((slug) => `${COLLECTIONS_PAGE_PATH}/${slug}`),
  '/sitemap.xml',
];

export const withTags = (paths: string[], ...tags: PublicCacheTag[]): RevalidateRequest => ({ paths, tags });

/** Outfit writes change the home page and collection pages, which cache their own API responses by tag. */
export const outfitRevalidation = (...slugs: (string | undefined)[]): RevalidateRequest =>
  withTags(outfitPaths(...slugs), PUBLIC_CACHE_TAGS.collections, PUBLIC_CACHE_TAGS.home);

/** Settings are included because the header link depends on how many collections are published. */
export const collectionRevalidation = (...slugs: (string | undefined)[]): RevalidateRequest =>
  withTags(collectionPaths(...slugs), PUBLIC_CACHE_TAGS.collections, PUBLIC_CACHE_TAGS.home, PUBLIC_CACHE_TAGS.settings);

export const HOME_REVALIDATION: RevalidateRequest = withTags(['/'], PUBLIC_CACHE_TAGS.home);

const normalize = (target: string[] | RevalidateRequest): RevalidateRequest => {
  if (Array.isArray(target)) return { paths: [...new Set(target)].slice(0, MAX_PATHS) };
  if ('scope' in target) return target;
  return { ...target, ...(target.paths ? { paths: [...new Set(target.paths)].slice(0, MAX_PATHS) } : {}) };
};

export const createRevalidator =
  (env: Env): Revalidate =>
  async (target) => {
    const body = revalidateRequestSchema.safeParse(normalize(target));
    if (!body.success) return;
    try {
      const response = await fetch(env.WEB_REVALIDATE_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', [REVALIDATE_SECRET_HEADER]: env.REVALIDATE_SECRET },
        body: JSON.stringify(body.data),
        signal: AbortSignal.timeout(REVALIDATE_TIMEOUT_MS),
      });
      if (!response.ok) console.warn(`[revalidate] web responded ${response.status}`);
    } catch (error) {
      console.warn('[revalidate] request failed:', error instanceof Error ? error.message : error);
    }
  };
