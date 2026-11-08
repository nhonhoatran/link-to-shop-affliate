import { z } from 'zod';

// Served by the web app and called by the API over the internal network
// (WEB_REVALIDATE_URL); Caddy sends the public /api/* prefix to the API instead.
export const REVALIDATE_PATH = '/api/revalidate';
export const REVALIDATE_SECRET_HEADER = 'x-revalidate-secret';

export const LOOKS_PAGE_PATH = '/looks';
export const COLLECTIONS_PAGE_PATH = '/collections';

// Fetch cache tags of the public API responses. `scope: 'all'` expires every tag because path
// revalidation does not reach a response shared by several pages.
export const PUBLIC_CACHE_TAGS = {
  settings: 'public-settings',
  collections: 'public-collections',
  home: 'public-home',
} as const;
export const PUBLIC_SETTINGS_CACHE_TAG = PUBLIC_CACHE_TAGS.settings;

// Only declared tags are accepted, so a caller cannot expire an arbitrary cache entry.
export const publicCacheTagSchema = z.enum(PUBLIC_CACHE_TAGS);
export type PublicCacheTag = z.infer<typeof publicCacheTagSchema>;

const MAX_PATHS = 50;

// `scope: 'all'` revalidates every page (e.g. site-wide settings changed),
// so callers never have to enumerate all slugs.
export const revalidateRequestSchema = z.union([
  z
    .object({
      paths: z.array(z.string().startsWith('/')).max(MAX_PATHS).optional(),
      tags: z.array(publicCacheTagSchema).max(Object.keys(PUBLIC_CACHE_TAGS).length).optional(),
    })
    .refine(({ paths, tags }) => (paths?.length ?? 0) + (tags?.length ?? 0) > 0, 'Provide at least one path or tag'),
  z.object({ scope: z.literal('all') }),
]);

export type RevalidateRequest = z.infer<typeof revalidateRequestSchema>;
export type RevalidateResponse = { revalidated: string[] };
