import type { PublicCollectionDto, PublicSettingsDto } from '@under30ss/shared';
import { describe, expect, it } from 'vitest';
import { sampleCollectionCards } from '@under30ss/shared/fixtures';
import { buildCollectionMetadata, buildCollectionsMetadata } from '@/lib/seo/build-collection-metadata';

const settings: PublicSettingsDto = {
  siteName: 'Shop',
  seoTitle: 'Shop title',
  seoDescription: 'Site description',
  ogImageUrl: '/media/og.webp',
  looksPageSize: 12,
  relatedOutfitsCount: 4,
};
const base = { settings, siteUrl: 'https://shop.test', label: 'Bộ sưu tập' };
const collection = (extra: Partial<PublicCollectionDto> = {}): PublicCollectionDto => ({
  ...sampleCollectionCards[0]!,
  ...extra,
});

describe('buildCollectionsMetadata', () => {
  it('uses the label as title and canonical /collections for page 1', () => {
    const metadata = buildCollectionsMetadata({ ...base, page: 1 });
    expect(metadata.title).toBe('Bộ sưu tập | Shop');
    expect(metadata.alternates?.canonical).toBe('https://shop.test/collections');
    expect(metadata.description).toBe('Site description');
  });

  it('keeps ?page in the canonical and the title for later pages', () => {
    const metadata = buildCollectionsMetadata({ ...base, page: 3 });
    expect(metadata.alternates?.canonical).toBe('https://shop.test/collections?page=3');
    expect(metadata.title).toContain('Trang 3');
  });

  it('falls back to a generated description when the site one is blank', () => {
    const metadata = buildCollectionsMetadata({ ...base, settings: { ...settings, seoDescription: ' ' }, page: 1 });
    expect(metadata.description).toContain('Shop');
  });
});

describe('buildCollectionMetadata', () => {
  it('titles with the collection name and canonicalises under /collections/<slug>', () => {
    const metadata = buildCollectionMetadata({ ...base, collection: collection(), page: 2 });
    expect(metadata.title).toBe('Streetwear - Trang 2 | Shop');
    expect(metadata.alternates?.canonical).toBe('https://shop.test/collections/streetwear?page=2');
  });

  it('prefers seoDescription, then description, then the site description', () => {
    const withBoth = collection({ seoDescription: 'Seo text', description: 'Desc' });
    expect(buildCollectionMetadata({ ...base, collection: withBoth, page: 1 }).description).toBe('Seo text');
    const onlyDescription = collection({ description: 'Desc' });
    expect(buildCollectionMetadata({ ...base, collection: onlyDescription, page: 1 }).description).toBe('Desc');
    const { description: _omit, ...bare } = collection();
    expect(buildCollectionMetadata({ ...base, collection: bare, page: 1 }).description).toBe('Site description');
    const blankSite = { ...base, settings: { ...settings, seoDescription: '' } };
    expect(buildCollectionMetadata({ ...blankSite, collection: bare, page: 1 }).description).toContain('Shop');
  });

  it('shares the cover image as an absolute URL', () => {
    const metadata = buildCollectionMetadata({ ...base, collection: collection(), page: 1 });
    const images = metadata.openGraph?.images as { url: string; alt: string }[];
    expect(images[0]).toMatchObject({ url: sampleCollectionCards[0]!.coverImage.url, alt: 'Streetwear' });
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image' });
  });
});
