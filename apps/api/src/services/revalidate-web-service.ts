import { REVALIDATE_SECRET_HEADER, revalidateRequestSchema } from '@under30ss/shared';
import type { Env } from '../config/env-config';
import type { Revalidate } from '../lib/app-context';

// Short on purpose: a slow web app must not stall admin writes.
const REVALIDATE_TIMEOUT_MS = 3000;
const MAX_PATHS = 50;

export const outfitPaths = (...slugs: (string | undefined)[]): string[] => [
  '/',
  ...slugs.filter((slug): slug is string => Boolean(slug)).map((slug) => `/look/${slug}`),
  '/sitemap.xml',
];

export const createRevalidator =
  (env: Env): Revalidate =>
  async (target) => {
    const request = Array.isArray(target) ? { paths: [...new Set(target)].slice(0, MAX_PATHS) } : target;
    const body = revalidateRequestSchema.safeParse(request);
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
