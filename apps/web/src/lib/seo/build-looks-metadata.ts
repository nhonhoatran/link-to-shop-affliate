import type { Metadata } from 'next';
import type { PublicSettingsDto } from '@under30ss/shared';
import { LOOKS_PAGE_COPY } from '@/components/public/public-copy';
import { absoluteUrl, looksPagePath } from './absolute-url';

interface LooksMetadataInput {
  settings: PublicSettingsDto;
  siteUrl: string;
  page: number;
}

export const buildLooksMetadata = ({ settings, siteUrl, page }: LooksMetadataInput): Metadata => {
  const heading = page > 1 ? `${LOOKS_PAGE_COPY.title} - ${LOOKS_PAGE_COPY.pageLabel(page)}` : LOOKS_PAGE_COPY.title;
  const title = `${heading} | ${settings.siteName}`;
  const description = settings.seoDescription.trim() || LOOKS_PAGE_COPY.fallbackDescription(settings.siteName);
  const canonical = absoluteUrl(siteUrl, looksPagePath(page));
  const image = settings.ogImageUrl ? [{ url: absoluteUrl(siteUrl, settings.ogImageUrl), alt: settings.siteName }] : null;
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
      ...(image ? { images: image } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(image ? { images: [image[0]!.url] } : {}),
    },
  };
};
