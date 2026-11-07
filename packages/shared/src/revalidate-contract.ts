import { z } from 'zod';

// Served by the web app and called by the API over the internal network
// (WEB_REVALIDATE_URL); Caddy sends the public /api/* prefix to the API instead.
export const REVALIDATE_PATH = '/api/revalidate';
export const REVALIDATE_SECRET_HEADER = 'x-revalidate-secret';

export const LOOKS_PAGE_PATH = '/looks';

// Fetch cache tag of the public settings; expired on `scope: 'all'` because path revalidation
// does not reach a settings response shared by every page.
export const PUBLIC_SETTINGS_CACHE_TAG = 'public-settings';

// `scope: 'all'` revalidates every page (e.g. site-wide settings changed),
// so callers never have to enumerate all slugs.
export const revalidateRequestSchema = z.union([
  z.object({ paths: z.array(z.string().startsWith('/')).min(1).max(50) }),
  z.object({ scope: z.literal('all') }),
]);

export type RevalidateRequest = z.infer<typeof revalidateRequestSchema>;
export type RevalidateResponse = { revalidated: string[] };
