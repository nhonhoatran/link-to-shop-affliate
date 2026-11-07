import type { PublicSettingsDto } from '@under30ss/shared';
import { samplePublicOutfit } from '@under30ss/shared/fixtures';
import { buildOutfitMetadata, buildSiteMetadata } from '@/lib/seo/build-outfit-metadata';

const SITE = 'https://shop.example.test';
const settings: PublicSettingsDto = {
  siteName: 'Site X',
  seoTitle: 'Site X home',
  seoDescription: 'Default description',
  ogImageUrl: '/media/public/og.webp',
  looksPageSize: 12,
  relatedOutfitsCount: 8,
};

describe('buildOutfitMetadata', () => {
  it('composes title, canonical and model image', () => {
    const meta = buildOutfitMetadata({ outfit: samplePublicOutfit, settings, siteUrl: SITE });
    expect(meta.title).toBe(`${samplePublicOutfit.title} | Site X`);
    expect(meta.description).toBe(samplePublicOutfit.seoDescription);
    expect(meta.alternates?.canonical).toBe(`${SITE}/look/${samplePublicOutfit.slug}`);
    expect(meta.openGraph).toMatchObject({ siteName: 'Site X', url: `${SITE}/look/${samplePublicOutfit.slug}` });
    expect(meta.openGraph?.images).toEqual([
      expect.objectContaining({ url: samplePublicOutfit.modelImage.url, width: samplePublicOutfit.modelImage.width }),
    ]);
    expect(meta.twitter).toMatchObject({ card: 'summary_large_image', images: [samplePublicOutfit.modelImage.url] });
  });

  it('falls back to the settings description when the outfit has none or only spaces', () => {
    for (const seoDescription of [undefined, '   ']) {
      const outfit = { ...samplePublicOutfit, seoDescription };
      expect(buildOutfitMetadata({ outfit, settings, siteUrl: SITE }).description).toBe('Default description');
    }
  });

  it('makes a relative model image url absolute', () => {
    const outfit = { ...samplePublicOutfit, modelImage: { ...samplePublicOutfit.modelImage, url: '/media/public/m.webp' } };
    const meta = buildOutfitMetadata({ outfit, settings, siteUrl: `${SITE}/` });
    expect(meta.twitter).toMatchObject({ images: [`${SITE}/media/public/m.webp`] });
  });
});

describe('buildSiteMetadata', () => {
  it('uses settings for title, canonical root and og image', () => {
    const meta = buildSiteMetadata({ settings, siteUrl: SITE });
    expect(meta.title).toBe('Site X home');
    expect(meta.alternates?.canonical).toBe(`${SITE}/`);
    expect(meta.openGraph?.images).toEqual([{ url: `${SITE}/media/public/og.webp`, alt: 'Site X' }]);
  });

  it('omits images and uses the summary card when no og image is set', () => {
    const meta = buildSiteMetadata({ settings: { ...settings, ogImageUrl: null }, siteUrl: SITE });
    expect(meta.openGraph).not.toHaveProperty('images');
    expect(meta.twitter).toMatchObject({ card: 'summary' });
  });
});
