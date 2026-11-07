import type { MetadataRoute } from 'next';
import { LOOKS_PAGE_PATH } from '@under30ss/shared';
import { getWebEnv } from '@/lib/web-env';
import { absoluteUrl, outfitPath } from '@/lib/seo/absolute-url';
import { getOutfitSlugs } from '@/lib/seo/public-data-loaders';

// Reads the API per request; it is not reachable while `next build` runs.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getWebEnv().SITE_URL;
  const { items } = await getOutfitSlugs();
  return [
    { url: absoluteUrl(siteUrl, '/') },
    { url: absoluteUrl(siteUrl, LOOKS_PAGE_PATH) },
    ...items.map(({ slug, updatedAt }) => ({
      url: absoluteUrl(siteUrl, outfitPath(slug)),
      lastModified: updatedAt,
    })),
  ];
}
