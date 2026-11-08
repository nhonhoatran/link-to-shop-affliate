import type { MetadataRoute } from 'next';
import { COLLECTIONS_PAGE_PATH, LOOKS_PAGE_PATH } from '@under30ss/shared';
import { getWebEnv } from '@/lib/web-env';
import { absoluteUrl, collectionPagePath, outfitPath } from '@/lib/seo/absolute-url';
import { getCollectionSlugs } from '@/lib/seo/public-collection-loaders';
import { getOutfitSlugs } from '@/lib/seo/public-data-loaders';

// Reads the API per request; it is not reachable while `next build` runs.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getWebEnv().SITE_URL;
  const [outfits, collections] = await Promise.all([getOutfitSlugs(), getCollectionSlugs()]);
  return [
    { url: absoluteUrl(siteUrl, '/') },
    { url: absoluteUrl(siteUrl, LOOKS_PAGE_PATH) },
    // The index only exists for visitors once at least one collection is published.
    ...(collections.items.length > 0 ? [{ url: absoluteUrl(siteUrl, COLLECTIONS_PAGE_PATH) }] : []),
    ...outfits.items.map(({ slug, updatedAt }) => ({
      url: absoluteUrl(siteUrl, outfitPath(slug)),
      lastModified: updatedAt,
    })),
    ...collections.items.map(({ slug, updatedAt }) => ({
      url: absoluteUrl(siteUrl, collectionPagePath(slug, 1)),
      lastModified: updatedAt,
    })),
  ];
}
