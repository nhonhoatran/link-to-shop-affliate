import type { Metadata } from 'next';
import { type PublicCollectionDto, type PublicSettingsDto } from '@under30ss/shared';
import { COLLECTIONS_COPY } from '@/components/public/collection-copy';
import { LOOKS_PAGE_COPY } from '@/components/public/public-copy';
import { absoluteUrl, collectionPagePath, collectionsPagePath } from './absolute-url';

interface BaseInput {
  settings: PublicSettingsDto;
  siteUrl: string;
  page: number;
  /** Resolved collections label (setting or default). */
  label: string;
}

interface ShareImage {
  url: string;
  width?: number;
  height?: number;
  alt: string;
}

const compose = (
  heading: string,
  description: string,
  canonical: string,
  { settings, page }: BaseInput,
  image: ShareImage | null,
): Metadata => {
  const title = `${page > 1 ? `${heading} - ${LOOKS_PAGE_COPY.pageLabel(page)}` : heading} | ${settings.siteName}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      url: canonical,
      siteName: settings.siteName,
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(image ? { images: [image.url] } : {}),
    },
  };
};

export const buildCollectionsMetadata = (input: BaseInput): Metadata => {
  const { settings, siteUrl, page, label } = input;
  const description = settings.seoDescription.trim() || COLLECTIONS_COPY.fallbackDescription(settings.siteName, label);
  const image = settings.ogImageUrl ? { url: absoluteUrl(siteUrl, settings.ogImageUrl), alt: settings.siteName } : null;
  return compose(label, description, absoluteUrl(siteUrl, collectionsPagePath(page)), input, image);
};

export const buildCollectionMetadata = (input: BaseInput & { collection: PublicCollectionDto }): Metadata => {
  const { collection, settings, siteUrl, page } = input;
  const description =
    collection.seoDescription?.trim() ||
    collection.description?.trim() ||
    settings.seoDescription.trim() ||
    COLLECTIONS_COPY.fallbackDescription(settings.siteName, collection.name);
  const cover = collection.coverImage;
  return compose(collection.name, description, absoluteUrl(siteUrl, collectionPagePath(collection.slug, page)), input, {
    url: absoluteUrl(siteUrl, cover.url),
    width: cover.width,
    height: cover.height,
    alt: collection.name,
  });
};
