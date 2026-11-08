import type { Metadata } from 'next';
import type { PublicOutfitDto, PublicSettingsDto } from '@under30ss/shared';
import { SITE_META_COPY } from '@/components/public/public-copy';
import { absoluteUrl, outfitPath } from './absolute-url';

interface SiteMetadataInput {
  settings: PublicSettingsDto;
  siteUrl: string;
}

interface OutfitMetadataInput extends SiteMetadataInput {
  outfit: PublicOutfitDto;
}

interface ShareImage {
  url: string;
  width?: number;
  height?: number;
  alt: string;
}

const buildCommon = (
  title: string,
  description: string,
  canonical: string,
  siteName: string,
  image: ShareImage | null,
): Metadata => ({
  title,
  description,
  alternates: { canonical },
  openGraph: {
    type: 'website',
    url: canonical,
    siteName,
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
});

export const buildOutfitMetadata = ({ outfit, settings, siteUrl }: OutfitMetadataInput): Metadata =>
  buildCommon(
    `${outfit.title} | ${settings.siteName}`,
    outfit.seoDescription?.trim() || settings.seoDescription,
    absoluteUrl(siteUrl, outfitPath(outfit.slug)),
    settings.siteName,
    {
      url: absoluteUrl(siteUrl, outfit.modelImage.url),
      width: outfit.modelImage.width,
      height: outfit.modelImage.height,
      alt: outfit.title,
    },
  );

export const siteDescription = (settings: PublicSettingsDto): string =>
  settings.seoDescription.trim() || SITE_META_COPY.fallbackDescription(settings.siteName);

/** Used on `/`. */
export const buildSiteMetadata = ({ settings, siteUrl }: SiteMetadataInput): Metadata =>
  buildCommon(
    settings.seoTitle,
    siteDescription(settings),
    absoluteUrl(siteUrl, '/'),
    settings.siteName,
    settings.ogImageUrl ? { url: absoluteUrl(siteUrl, settings.ogImageUrl), alt: settings.siteName } : null,
  );
